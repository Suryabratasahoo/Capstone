import pandas as pd
from textblob import TextBlob
import os
import joblib
import nltk
from collections import Counter

# Ensure NLTK resources are available
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('tokenizers/punkt_tab')
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    nltk.download('punkt', quiet=True)
    nltk.download('punkt_tab', quiet=True)
    nltk.download('averaged_perceptron_tagger_eng', quiet=True)

def analyze_sentiment(text):
    """
    Returns the polarity of the text using TextBlob.
    Polarity is a float within the range [-1.0, 1.0].
    """
    try:
        return TextBlob(str(text)).sentiment.polarity
    except Exception:
        return 0.0

import re

ASPECT_DEFINITIONS = {
    "cleanliness": {
        "keywords": [r"\bclean", r"\bdirty", r"\bunclean", r"\bhygien", r"\btoilet", r"\bwashroom", r"\bbathroom", r"\bsmell", r"\bodour", r"\bcockroach", r"\bpest", r"\bbedroll", r"\blinen", r"\bblanket", r"\bgarbage", r"\btrash"],
        "pos_label": "Clean Coaches",
        "neg_label": "Needs Cleanliness",
        "pos_words": ["clean", "hygienic", "neat", "tidy", "fresh", "good", "super", "best"],
        "neg_words": ["dirty", "unclean", "smell", "stinking", "bad", "cockroach", "pest", "garbage", "trash", "poor"]
    },
    "punctuality": {
        "keywords": [r"\blate\b", r"\bdelay", r"\bdelayed", r"\bpunctual", r"\bon[ -]?time\b", r"\bschedule", r"\bspeed\b", r"\bfast\b", r"\bright time\b"],
        "pos_label": "Punctual Service",
        "neg_label": "Subject to Delays",
        "pos_words": ["ontime", "punctual", "fast", "speed", "before", "right", "superfast"],
        "neg_words": ["late", "delayed", "delay", "slow", "halted", "waiting", "stuck"]
    },
    "ac_comfort": {
        "keywords": [r"\bac\b", r"\bair condition", r"\bcooling", r"\bcomfort", r"\bcomfortable", r"\bberth\b", r"\bspacious", r"\bcramped", r"\bquiet"],
        "pos_label": "Comfortable AC",
        "neg_label": "AC Cooling Issues",
        "pos_words": ["chilling", "cool", "comfortable", "comfy", "good", "spacious", "peaceful", "nice"],
        "neg_words": ["not working", "warm", "hot", "suffocating", "cramped", "bad", "broken", "issue"]
    },
    "catering": {
        "keywords": [r"\bfood\b", r"\bpantry\b", r"\bmeal\b", r"\btea\b", r"\bcoffee\b", r"\bbreakfast\b", r"\bdinner\b", r"\blunch\b", r"\bsnack", r"\bcatering\b"],
        "pos_label": "Good Pantry Food",
        "neg_label": "Pantry Food Issues",
        "pos_words": ["tasty", "delicious", "fresh", "good", "hygienic", "hot", "nice", "great"],
        "neg_words": ["bad", "worst", "cold", "stale", "costly", "expensive", "unhygienic", "poor", "tasteless"]
    },
    "water_charging": {
        "keywords": [r"\bwater\b", r"\bcharging\b", r"\bsocket\b", r"\bplug\b", r"\bmobile charg", r"\bwater cooler\b", r"\btap\b", r"\bflush\b"],
        "pos_label": "Working Amenities",
        "neg_label": "Utility / Water Shortage",
        "pos_words": ["available", "working", "good", "full", "fine", "proper"],
        "neg_words": ["no water", "not working", "empty", "broken", "dry", "problem", "faulty"]
    },
    "staff_safety": {
        "keywords": [r"\bstaff\b", r"\btte\b", r"\battendant\b", r"\bguard\b", r"\bpolite\b", r"\bhelpful\b", r"\brude\b", r"\bsafe\b", r"\bsecurity\b", r"\bgrp\b", r"\brpf\b"],
        "pos_label": "Helpful Onboard Staff",
        "neg_label": "Staff Assistance Concerns",
        "pos_words": ["helpful", "polite", "cooperative", "safe", "kind", "prompt", "active"],
        "neg_words": ["rude", "unresponsive", "harassment", "bribe", "poor", "unhelpful", "careless"]
    }
}

def extract_keywords(text, top_n=3):
    """
    Aspect-Based Sentiment Analysis (ABSA) for transit reviews.
    Extracts high-signal operational transit highlights (Cleanliness, Punctuality,
    Food, Amenities, Staff) based on passenger sentiment instead of raw arbitrary tokens.
    """
    if not isinstance(text, str) or not text.strip():
        return ["Punctual Service", "Clean Coaches", "Comfortable Journey"][:top_n]
        
    sentences = []
    for s in re.split(r"[.!?;\n]+", text):
        s_clean = s.strip().lower()
        if len(s_clean) > 5:
            sentences.append(s_clean)
            
    aspect_scores = {}
    
    for aspect_name, conf in ASPECT_DEFINITIONS.items():
        pattern_re = "|".join(conf["keywords"])
        matching_sentences = [s for s in sentences if re.search(pattern_re, s)]
        
        if not matching_sentences:
            continue
            
        pos_mentions = 0
        neg_mentions = 0
        
        for s in matching_sentences:
            blob_pol = TextBlob(s).sentiment.polarity
            pos_matches = sum(1 for pw in conf["pos_words"] if pw in s)
            neg_matches = sum(1 for nw in conf["neg_words"] if nw in s)
            
            if re.search(r"\b(not|no|never|poor|worst|bad)\b", s):
                neg_matches += 1
                
            if pos_matches > neg_matches or blob_pol > 0.15:
                pos_mentions += 1
            elif neg_matches > pos_matches or blob_pol < -0.05:
                neg_mentions += 1
            else:
                if blob_pol >= 0:
                    pos_mentions += 0.5
                else:
                    neg_mentions += 0.5
                    
        total_mentions = len(matching_sentences)
        if pos_mentions >= neg_mentions:
            label = conf["pos_label"]
        else:
            label = conf["neg_label"]
            
        aspect_scores[label] = total_mentions
        
    if not aspect_scores:
        overall_pol = TextBlob(text[:500]).sentiment.polarity
        if overall_pol >= 0.15:
            return ["Punctual Service", "Clean Coaches", "Comfortable Journey"][:top_n]
        elif overall_pol >= 0.0:
            return ["Comfortable Berths", "Working Amenities"][:top_n]
        else:
            return ["Subject to Delays", "Needs Cleanliness"][:top_n]
            
    sorted_items = sorted(aspect_scores.items(), key=lambda x: x[1], reverse=True)
    return [k for k, v in sorted_items[:top_n]]

def load_and_process_data(filepath="reviews_train.csv", cache_path="processed_data_train.pkl"):
    """
    Loads the train reviews data, calculates sentiment for each review,
    extracts keywords, and aggregates the data by train route.
    Uses joblib for caching.
    """
    if os.path.exists(cache_path):
        print(f"Loading cached data from {cache_path}...")
        return joblib.load(cache_path)
        
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"{filepath} not found.")

    print(f"Loading data from {filepath}...")
    df = pd.read_csv(filepath)
    
    print("Calculating sentiment for reviews...")
    df['sentiment'] = df['review'].apply(analyze_sentiment)
    
    df['upvotes'] = df['upvotes'].fillna(0)
    df['review'] = df['review'].fillna("")

    print("Aggregating data by route...")
    aggregated = df.groupby(['train_number', 'train_name']).agg(
        total_upvotes=pd.NamedAgg(column='upvotes', aggfunc='sum'),
        avg_sentiment=pd.NamedAgg(column='sentiment', aggfunc='mean'),
        combined_reviews=pd.NamedAgg(column='review', aggfunc=lambda x: ' '.join(x)),
        review_count=pd.NamedAgg(column='review', aggfunc='count')
    ).reset_index()

    print("Extracting keywords for each route...")
    aggregated['keywords'] = aggregated['combined_reviews'].apply(extract_keywords)

    print(f"Saving processed data to {cache_path}...")
    joblib.dump(aggregated, cache_path)
    
    print("Data processing complete.")
    return aggregated

if __name__ == "__main__":
    df_agg = load_and_process_data()
    print("Aggregated data shape:", df_agg.shape)
    print(df_agg.head())
