import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle
import os

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'dataset.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'disease_model.pkl')
SYMPTOMS_PATH = os.path.join(BASE_DIR, 'symptoms_list.pkl')

print("Loading dataset from:", DATASET_PATH)

try:
    df = pd.read_csv(DATASET_PATH)
except FileNotFoundError:
    print(f"Error: dataset.csv not found at {DATASET_PATH}")
    exit(1)

# Clean dataset: fill NaNs with empty string
df = df.fillna('')

# Extract all unique symptoms
all_symptoms = set()
for col in df.columns:
    if col != 'Disease':
        unique_vals = df[col].unique()
        for val in unique_vals:
            val = str(val).strip()
            if val:
                all_symptoms.add(val)

all_symptoms = sorted(list(all_symptoms))
print(f"Total unique symptoms found: {len(all_symptoms)}")

# Save the list of symptoms
with open(SYMPTOMS_PATH, 'wb') as f:
    pickle.dump(all_symptoms, f)

# Prepare Training Data
X = []
y = df['Disease']

for index, row in df.iterrows():
    vector = []
    # Collect symptoms for this row
    current_symptoms = set()
    for col in df.columns:
        if col != 'Disease':
            val = str(row[col]).strip()
            if val:
                current_symptoms.add(val)
    
    # Create binary vector
    for symptom in all_symptoms:
        if symptom in current_symptoms:
            vector.append(1)
        else:
            vector.append(0)
    X.append(vector)

# Train Model
print("Training Random Forest Model...")
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X, y)

# Save Model
with open(MODEL_PATH, 'wb') as f:
    pickle.dump(clf, f)

print(f"Model trained and saved successfully to {MODEL_PATH}")
