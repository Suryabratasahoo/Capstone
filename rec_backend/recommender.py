import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os
import joblib

class RouteRecommender:
    def __init__(self, df, cache_path="embeddings_cache_train.pkl"):
        """
        Initializes the recommender with the aggregated route data.
        df should be the output from data_processor.load_and_process_data()
        """
        self.df = df.copy()
        self.cache_path = cache_path
        
        print("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        # This is a small, fast model for semantic search
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        if os.path.exists(self.cache_path):
            print(f"Loading cached embeddings from {self.cache_path}...")
            self.embeddings = joblib.load(self.cache_path)
        else:
            print("Computing embeddings for train profiles (this might take a moment)...")
            self.embeddings = self.model.encode(self.df['combined_reviews'].tolist())
            print(f"Saving embeddings to {self.cache_path}...")
            joblib.dump(self.embeddings, self.cache_path)
            
        # Normalize upvotes using log scale (to prevent outliers from dominating)
        self.df['norm_upvotes'] = np.log1p(self.df['total_upvotes'])
        max_upvotes = self.df['norm_upvotes'].max()
        if max_upvotes > 0:
            self.df['norm_upvotes'] = self.df['norm_upvotes'] / max_upvotes
            
        # Normalize sentiment using actual dataset min/max for a realistic 1-5 star spread
        min_sent = self.df['avg_sentiment'].min()
        max_sent = self.df['avg_sentiment'].max()
        if max_sent > min_sent:
            self.df['norm_sentiment'] = (self.df['avg_sentiment'] - min_sent) / (max_sent - min_sent)
        else:
            self.df['norm_sentiment'] = 0.5

    def get_recommendations(self, query, top_n=3):
        """
        Given a user query, returns the top_n recommended routes along with
        a rating out of 5 and extracted keywords.
        """
        # Vectorize the query semantically
        query_vec = self.model.encode([query])
        
        # Calculate cosine similarity between the query and all routes
        sim_scores = cosine_similarity(query_vec, self.embeddings).flatten()
        self.df['similarity'] = sim_scores
        
        # Fallback normalization
        max_sim = self.df['similarity'].max()
        if max_sim > 0:
            self.df['norm_similarity'] = self.df['similarity'] / max_sim
        else:
            self.df['norm_similarity'] = 0
            
        # Final score logic - increased similarity weight for better search accuracy
        self.df['final_score'] = (
            0.75 * self.df['norm_similarity'] +
            0.15 * self.df['norm_sentiment'] +
            0.10 * self.df['norm_upvotes']
        )
        
        # Scale to 5-star rating (minimum 1 star)
        self.df['rating_out_of_5'] = 1 + (self.df['final_score'] * 4)
        
        # Sort by final score
        top_routes = self.df.sort_values(by='final_score', ascending=False).head(top_n)
        
        results = []
        for _, row in top_routes.iterrows():
            results.append({
                'train_number': row['train_number'],
                'train_name': row['train_name'],
                'rating': round(row['rating_out_of_5'], 1),
                'highlights': row['keywords'],
                'similarity_score': round(row['similarity'], 3),
                'sentiment_score': round(row['avg_sentiment'], 2),
                'total_upvotes': row['total_upvotes']
            })
            
        return results

    def get_train_rating(self, train_number):
        """
        Returns the rating and details of a specific train by its number.
        """
        try:
            train_number = int(train_number)
        except ValueError:
            return None
            
        train = self.df[self.df['train_number'] == train_number]
        if train.empty:
            return None
            
        row = train.iloc[0]
        # For a specific train rating, we don't have a search query, 
        # so rating should purely reflect sentiment and upvotes.
        final_score = (
            0.8 * row['norm_sentiment'] +
            0.2 * row['norm_upvotes']
        )
        rating_out_of_5 = 1 + (final_score * 4)
        
        return {
            'train_number': row['train_number'],
            'train_name': row['train_name'],
            'rating': round(rating_out_of_5, 1),
            'highlights': row['keywords'],
            'similarity_score': 1.0,
            'sentiment_score': round(row['avg_sentiment'], 2),
            'total_upvotes': row['total_upvotes']
        }

if __name__ == "__main__":
    # Small test logic
    from data_processor import load_and_process_data
    df = load_and_process_data()
    recommender = RouteRecommender(df)
    print(recommender.get_recommendations("clean and comfortable AC"))
