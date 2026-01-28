from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load Model and Symptoms
try:
    with open('disease_model.pkl', 'rb') as f:
        model = pickle.load(f)
    with open('symptoms_list.pkl', 'rb') as f:
        symptoms_list = pickle.load(f)
    print("Model and symptoms loaded successfully.")
except FileNotFoundError:
    print("Error: Model files not found. Please run 'train_model.py' first.")
    model = None
    symptoms_list = []

@app.route('/', methods=['GET'])
def home():
    return "MedEcho ML Service is Running"

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500

    data = request.json
    user_symptoms = data.get('symptoms', [])
    
    # Preprocess input: Convert user symptoms to vector
    input_vector = [0] * len(symptoms_list)
    
    # Simple matching (should be improved with NLP/fuzzy matching later)
    matched_symptoms = []
    for i, symptom in enumerate(symptoms_list):
        if symptom in user_symptoms:
            input_vector[i] = 1
            matched_symptoms.append(symptom)
            
    # Reshape for prediction
    input_vector = np.array(input_vector).reshape(1, -1)
    
    # Predict
    prediction = model.predict(input_vector)[0]
    probabilities = model.predict_proba(input_vector)
    confidence = np.max(probabilities) * 100
    
    return jsonify({
        'disease': prediction,
        'confidence': f"{confidence:.2f}%",
        'matched_symptoms': matched_symptoms
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True)
