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

def extract_keywords(text, top_n=5):
    """
    Extracts the most frequent nouns and adjectives from the text.
    """
    if not isinstance(text, str) or not text:
        return []
        
    tokens = nltk.word_tokenize(text.lower())
    # Filter out small words or non-alphabetic, and common meaningless words
    stop_words = {'train', 'station', 'time', 'ticket', 'coach', 'seat', 'class'}
    words = [word for word in tokens if word.isalpha() and len(word) > 2 and word not in stop_words]
    
    # Tag parts of speech
    tagged = nltk.pos_tag(words)
    
    # Keep only Nouns (NN, NNS) and Adjectives (JJ)
    keywords = [word for word, tag in tagged if tag in ('NN', 'NNS', 'JJ')]
    
    # Count frequencies and return top_n
    counter = Counter(keywords)
    return [word for word, count in counter.most_common(top_n)]

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
