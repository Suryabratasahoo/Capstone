import pandas as pd
import random

# Generate a synthetic dataset of bus reviews to show the judges
bus_operators = ["APSRTC", "TSRTC", "KSRTC", "OSRTC", "VRL Travels", "Orange Travels", "SRS Travels"]
bus_numbers = [f"{op}-{random.randint(100, 999)}" for op in bus_operators for _ in range(5)]

positive_reviews = [
    "The bus was perfectly on time and the AC worked great throughout the journey.",
    "Very comfortable sleeper seats. The driver drove very safely.",
    "Clean bus, courteous staff, and reached the destination 10 minutes early.",
    "Good budget friendly option. The state transport has really improved.",
    "Excellent suspension, didn't feel the bumps on the highway. Good night's sleep.",
    "Charging ports worked! That's a huge plus. Very clean interiors."
]

neutral_reviews = [
    "It was an okay journey. AC was a bit too cold but seats were fine.",
    "Reached on time but the boarding point was very crowded.",
    "Standard state transport bus. Nothing special but gets the job done.",
    "Bus stopped too many times at night, disturbed my sleep, but otherwise fine.",
]

negative_reviews = [
    "Bus was delayed by 2 hours. Very frustrating experience.",
    "The seats were not cleaned properly and AC was leaking water.",
    "Rash driving by the driver. Felt unsafe during the ghat section.",
    "Overpriced for the quality. Non-functional charging ports."
]

data = []

for bus in bus_numbers:
    operator = bus.split('-')[0]
    # Each bus gets 5 to 15 reviews
    num_reviews = random.randint(5, 15)
    
    for _ in range(num_reviews):
        # Pick a random review type based on a slight positive bias
        review_type = random.choices(
            [positive_reviews, neutral_reviews, negative_reviews], 
            weights=[0.6, 0.25, 0.15]
        )[0]
        
        review_text = random.choice(review_type)
        upvotes = random.randint(0, 50)
        
        data.append({
            "bus_number": bus,
            "operator_name": operator,
            "review": review_text,
            "upvotes": upvotes
        })

df = pd.DataFrame(data)
df.to_csv("bus_reviews.csv", index=False)
print(f"Successfully generated {len(df)} fake bus reviews in 'bus_reviews.csv'")
