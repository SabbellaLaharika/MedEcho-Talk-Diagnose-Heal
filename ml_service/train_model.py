import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle

# Create a dummy dataset for demonstration
# In a real scenario, this would load a CSV like 'dataset.csv'
data = {
    'Symptom_1': ['fever', 'cough', 'headache', 'stomach_pain', 'chest_pain', 'fever', 'cough', 'headache', 'vomiting', 'nausea'],
    'Symptom_2': ['cough', 'fever', 'nausea', 'vomiting', 'breathlessness', 'headache', 'cold', 'dizziness', 'stomach_pain', 'fever'],
    'Symptom_3': ['fatigue', 'headache', 'dizziness', 'fatigue', 'sweating', 'shivering', 'sore_throat', 'anxiety', 'diarrhea', 'fatigue'],
    'Disease': ['Flu', 'Flu', 'Migraine', 'Food Poisoning', 'Heart Issue', 'Malaria', 'Common Cold', 'Hypertension', 'Gastroenteritis', 'Typhoid']
}

# Convert to DataFrame
df = pd.DataFrame(data)

# Get all unique symptoms to create a bag-of-words vector
all_symptoms = set(df['Symptom_1']).union(set(df['Symptom_2'])).union(set(df['Symptom_3']))
all_symptoms = sorted(list(all_symptoms))

# Save the list of symptoms
with open('symptoms_list.pkl', 'wb') as f:
    pickle.dump(all_symptoms, f)

print(f"Total symptoms: {len(all_symptoms)}")

# Prepare Training Data
X = []
y = df['Disease']

for index, row in df.iterrows():
    vector = []
    current_symptoms = [row['Symptom_1'], row['Symptom_2'], row['Symptom_3']]
    for symptom in all_symptoms:
        if symptom in current_symptoms:
            vector.append(1)
        else:
            vector.append(0)
    X.append(vector)

# Train Model
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X, y)

# Save Model
with open('disease_model.pkl', 'wb') as f:
    pickle.dump(clf, f)

print("Model trained and saved as 'disease_model.pkl'")
