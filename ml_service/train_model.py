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

# Prepare and Augment Training Data
import random
X = []
y = []

for index, row in df.iterrows():
    # Collect symptoms for this row
    current_symptoms = set()
    for col in df.columns:
        if col != 'Disease':
            val = str(row[col]).strip()
            if val:
                current_symptoms.add(val)
    
    # Create base binary vector
    base_vector = []
    for symptom in all_symptoms:
        if symptom in current_symptoms:
            base_vector.append(1)
        else:
            base_vector.append(0)
            
    # Synthetically generate 50 samples per disease for training robustness
    for _ in range(50):
        modified_vector = base_vector.copy()
        # 30% chance to drop one symptom to simulate real-world varied input
        if random.random() < 0.3:
            active_indices = [i for i, v in enumerate(modified_vector) if v == 1]
            if active_indices:
                modified_vector[random.choice(active_indices)] = 0
        X.append(modified_vector)
        y.append(row['Disease'])

# Train/Test Split to verify accuracy (Requirement > 95%)
print("Splitting dataset for evaluation...")
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

X = np.array(X)
y = np.array(y)
# Use stratify=y to ensure all diseases are present in both train and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Train Eval Model
print("Training Random Forest Evaluation Model...")
eval_clf = RandomForestClassifier(n_estimators=300, max_depth=50, random_state=42)
eval_clf.fit(X_train, y_train)

# Predict & Evaluate
y_pred = eval_clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"Model Accuracy on Test Set: {acc * 100:.2f}%")

# Train Final Model on all data for production
print("Training Final Production Model...")
final_clf = RandomForestClassifier(n_estimators=300, max_depth=50, random_state=42)
final_clf.fit(X, y)

# Save Final Model
with open(MODEL_PATH, 'wb') as f:
    pickle.dump(final_clf, f)

print(f"Model trained and saved successfully to {MODEL_PATH}")
