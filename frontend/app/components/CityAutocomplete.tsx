'use client';
import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  inputClassName?: string;
  labelClassName?: string;
}

export default function CityAutocomplete({ value, onChange, placeholder, label, inputClassName, labelClassName }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v4/cities/autocomplete?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length === 1 && data[0].toLowerCase() === value.toLowerCase()) {
            setSuggestions([]);
          } else {
            setSuggestions(data);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(timeoutId);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div ref={wrapperRef} className="relative w-full flex flex-col flex-1 justify-center">
      {label && (
        <label className={labelClassName || "text-[11px] uppercase font-black text-zinc-400 tracking-wider mb-1"}>
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
        className={inputClassName || "bg-transparent text-base font-black text-zinc-900 focus:outline-none border-none placeholder-zinc-300 w-full"}
        required
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-[9999] top-full left-0 w-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] max-h-60 overflow-y-auto py-2">
          {suggestions.map((city, idx) => (
            <li 
              key={idx}
              onClick={() => {
                onChange(city);
                setIsOpen(false);
              }}
              className="px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-brand-lime hover:text-brand-forest cursor-pointer transition-colors"
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
