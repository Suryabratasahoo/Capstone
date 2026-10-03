import sys
import argparse
from data_processor import load_and_process_data
from recommender import RouteRecommender

def main():
    parser = argparse.ArgumentParser(description="Route Recommendation API/CLI")
    parser.add_argument('--query', type=str, help="Search query for routes (e.g. 'clean and fast')")
    parser.add_argument('--train-number', type=int, help="Get rating for a specific train number")
    parser.add_argument('--top-n', type=int, default=3, help="Number of routes to return")
    
    args = parser.parse_args()
    
    print("Initializing Recommender System...")
    try:
        df = load_and_process_data()
        recommender = RouteRecommender(df)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please ensure the CSV file is present.")
        sys.exit(1)
        
    print("Recommender System Ready!\n")

    if args.train_number:
        # Get single train rating
        rec = recommender.get_train_rating(args.train_number)
        if rec:
            print(f"Rating for {rec['train_name']} ({rec['train_number']}):")
            print(f"   Rating: {rec['rating']} / 5")
            print(f"   (Sentiment: {rec['sentiment_score']}, Upvotes: {rec['total_upvotes']})\n")
            print(f"   Highlights: {', '.join(rec['highlights'])}")
        else:
            print(f"Train number {args.train_number} not found.")
    elif args.query:
        # API / CLI mode with argument
        recommendations = recommender.get_recommendations(args.query, top_n=args.top_n)
        print(f"Top {args.top_n} recommendations for '{args.query}':")
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec['train_name']} ({rec['train_number']})")
            print(f"   Rating: {rec['rating']} / 5")
            print(f"   (Similarity: {rec['similarity_score']}, Sentiment: {rec['sentiment_score']}, Upvotes: {rec['total_upvotes']})\n")
    else:
        # Interactive Hybrid mode
        print("Enter a query to get route recommendations (or type 'exit' to quit):")
        while True:
            try:
                query = input("\n> ")
                if query.lower().strip() in ['exit', 'quit']:
                    break
                if not query.strip():
                    continue
                
                if query.isdigit():
                    rec = recommender.get_train_rating(int(query))
                    if rec:
                        print(f"\nRating for {rec['train_name']} ({rec['train_number']}):")
                        print(f"   Rating: {rec['rating']} / 5")
                        print(f"   (Sentiment: {rec['sentiment_score']}, Upvotes: {rec['total_upvotes']})")
                        print(f"   Highlights: {', '.join(rec['highlights'])}")
                    else:
                        print(f"\nTrain number {query} not found.")
                    continue
                
                recommendations = recommender.get_recommendations(query, top_n=args.top_n)
                print(f"\nTop {args.top_n} recommendations:")
                for i, rec in enumerate(recommendations, 1):
                    print(f"{i}. {rec['train_name']} ({rec['train_number']})")
                    print(f"   Rating: {rec['rating']} / 5")
                    print(f"   (Similarity: {rec['similarity_score']}, Sentiment: {rec['sentiment_score']}, Upvotes: {rec['total_upvotes']})")
            
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error processing query: {e}")
                
    print("\nExiting.")

if __name__ == "__main__":
    main()
