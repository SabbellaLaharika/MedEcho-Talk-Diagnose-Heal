from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os
from chat_engine import ChatEngine
from deep_translator import GoogleTranslator
from langdetect import detect

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'disease_model.pkl')
SYMPTOMS_PATH = os.path.join(BASE_DIR, 'symptoms_list.pkl')

chat_engine = None

# Load Model and Symptoms
try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(SYMPTOMS_PATH, 'rb') as f:
        symptoms_list = pickle.load(f)
    
    print("Model and symptoms loaded successfully.")
    # Initialize Chat Engine
    chat_engine = ChatEngine(symptoms_list, model)
    
except FileNotFoundError:
    print("Error: Model files not found. Please run 'train_model.py' first.")
    model = None
    symptoms_list = []

@app.route('/', methods=['GET'])
def home():
    return "MedEcho ML Service is Running (Multilingual Mode)"

@app.route('/chat', methods=['POST'])
def chat():
    if not chat_engine:
        return jsonify({'response': "System is initializing or model is missing.", 'context': {}}), 500

    data = request.json
    user_text = data.get('text', '')
    context = data.get('context', {})
    client_lang = data.get('lang', 'en') # Get language from client
    
    if not user_text:
        return jsonify({'response': '', 'context': context, 'lang': 'en'})

    # 1. Determine Language
    # Prioritize client selection (higher accuracy for voice) vs auto-detect
    detected_lang = client_lang
    if detected_lang == 'auto':
        try:
            detected_lang = detect(user_text)
        except:
            detected_lang = 'en'
            
    print(f"Processing in Language: {detected_lang}")
    
    # 2. Translate to English (if not English)
    english_text = user_text
    if detected_lang != 'en':
        try:
            english_text = GoogleTranslator(source=detected_lang, target='en').translate(user_text)
            print(f"Translated to English: {english_text}")
        except Exception as e:
            print(f"Translation Error (Input): {e}")
            english_text = user_text # Fallback

    # 3. Process with Chat Engine (English)
    response_text_en, updated_context = chat_engine.process_message(english_text, context)
    
    # 4. Translate Response back to Target Language
    final_response_text = response_text_en
    if detected_lang != 'en':
         try:
            final_response_text = GoogleTranslator(source='en', target=detected_lang).translate(response_text_en)
            print(f"Translated to {detected_lang}: {final_response_text}")
         except Exception as e:
            print(f"Translation Error (Output): {e}")
    
    return jsonify({
        'response': final_response_text,
        'context': updated_context,
        'lang': detected_lang
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True)
