'use client';
import React, { useState, useEffect, useRef } from 'react';

export interface CityItem {
  city: string;
  summary: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  inputClassName?: string;
  labelClassName?: string;
  showSubtitle?: boolean;
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder,
  label,
  inputClassName,
  labelClassName,
  showSubtitle = true
}: Props) {
  const [suggestions, setSuggestions] = useState<CityItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<string>('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v4/cities/autocomplete?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const rawData = await res.json();
          const items: CityItem[] = rawData.map((d: any) => {
            if (typeof d === 'string') {
              return { city: d, summary: '' };
            }
            return { city: d.city, summary: d.summary || '' };
          });

          if (items.length === 1 && items[0].city.toLowerCase() === value.trim().toLowerCase()) {
            setSuggestions([]);
            if (items[0].summary) {
              setSelectedSummary(items[0].summary);
            }
          } else {
            setSuggestions(items);
            const exactMatch = items.find(it => it.city.toLowerCase() === value.trim().toLowerCase());
            if (exactMatch && exactMatch.summary) {
              setSelectedSummary(exactMatch.summary);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeoutId);
  }, [value]);

  // Initial lookup for pre-filled values
  useEffect(() => {
    let isMounted = true;
    if (value && value.trim().length >= 2 && !selectedSummary) {
      fetch(`http://127.0.0.1:8000/api/v4/cities/autocomplete?q=${encodeURIComponent(value.trim())}`)
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          if (Array.isArray(data)) {
            const match = data.find((d: any) => {
              const name = typeof d === 'string' ? d : d.city;
              return name.toLowerCase() === value.trim().toLowerCase();
            });
            if (match && typeof match !== 'string' && match.summary) {
              setSelectedSummary(match.summary);
            }
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (item: CityItem) => {
    onChange(item.city);
    setSelectedSummary(item.summary || '');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full flex flex-col flex-1 justify-center min-w-0">
      {label && (
        <label className={labelClassName || 'text-[11px] uppercase font-black text-zinc-400 tracking-wider mb-1'}>
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={inputClassName || 'bg-transparent text-base font-black text-zinc-900 focus:outline-none border-none placeholder-zinc-300 w-full'}
        required
      />

      {/* Selected Station Summary in Accent Foreground */}
      {showSubtitle && selectedSummary && (
        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-700 animate-in fade-in duration-200 overflow-hidden">
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100/90 text-emerald-800 tracking-wider shrink-0 border border-emerald-200/60">
            Region
          </span>
          <span className="truncate text-emerald-700 font-bold" title={selectedSummary}>
            {selectedSummary}
          </span>
        </div>
      )}

      {/* Dropdown Suggestions Menu */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-[9999] top-full left-0 min-w-full sm:min-w-[340px] mt-2 bg-white border border-zinc-200 rounded-2xl shadow-[0_12px_44px_-10px_rgba(0,0,0,0.18)] max-h-72 overflow-y-auto py-2 divide-y divide-zinc-100">
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(item)}
              className="px-4 py-2.5 hover:bg-[#ebf875]/40 cursor-pointer transition-colors group flex flex-col gap-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-zinc-900 group-hover:text-zinc-950">
                  {item.city}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-700">
                  Select
                </span>
              </div>
              {item.summary && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 leading-tight mt-0.5">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wider shrink-0">
                    Includes
                  </span>
                  <span className="truncate text-emerald-700 font-semibold">{item.summary}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
