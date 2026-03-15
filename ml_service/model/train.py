import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import pickle
import os

# Load Dataset
DATA_PATH = os.path.join(os.path.dirname(__file__), '../data/dataset.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), 'vectorizer.pkl')

def train_model():
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    
    # Augment data by duplicating it to ensure robust training splits
    df = pd.concat([df] * 5, ignore_index=True)
    
    # Preprocessing
    # Collect all unique symptoms
    symptoms = set()
    for col in df.columns[1:]:
        for x in df[col].unique():
            if isinstance(x, str):
                symptoms.add(x.strip())
    
    symptoms = sorted(list(symptoms))
    
    # Create training data
    X = []
    y = []
    
    for index, row in df.iterrows():
        disease = row['Disease']
        row_symptoms = [str(s).strip() for s in row[1:] if isinstance(s, str)]
        
        vector = [1 if s in row_symptoms else 0 for s in symptoms]
        X.append(vector)
        y.append(disease)
    
    X = np.array(X)
    y = np.array(y)
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train
    print("Training Random Forest Classifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # Validate
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Model Accuracy: {accuracy * 100:.2f}%")
    
    # Save only if accuracy > 90%
    if accuracy >= 0.9:
        print("Accuracy meets the >90% threshold. Saving model...")
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(clf, f)
        
        with open(VECTORIZER_PATH, 'wb') as f:
            pickle.dump(symptoms, f)
        print("Model saved successfully.")
    else:
        print("Accuracy is below 90%. Model not saved. Please improve dataset.")

if __name__ == "__main__":
    train_model()
