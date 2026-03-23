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
            supported_langs = ['en', 'hi', 'te', 'ta', 'bn', 'gu', 'kn', 'ml', 'pa', 'mr', 'ur', 'or', 'as', 'sd', 'sa', 'ne']
            if detected_lang not in supported_langs:
                detected_lang = 'en'
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

@app.route('/analyze', methods=['POST'])
def analyze():
    if not chat_engine:
        return jsonify({'error': "Model missing"}), 500
    
    data = request.json
    transcript = data.get('text', '')
    
    if not transcript:
        return jsonify({'error': 'No transcript provided'}), 400
        
    # Split transcript into speakers
    patient_text = ""
    doctor_text = ""
    
    lines = transcript.strip().split('\n')
    for line in lines:
        if line.startswith('Patient:'):
            patient_text += line.replace('Patient:', '').strip() + " "
        elif line.startswith('Doctor:'):
            doctor_text += line.replace('Doctor:', '').strip() + " "
        else:
            # Ambiguous line, assign to context
            patient_text += line + " "

    # 1. Extract Problems (Patient Side)
    symptoms, _ = chat_engine._extract_symptoms(patient_text.lower())
    disease = "Undetermined"
    confidence = 0
    if symptoms:
        disease, conf_val = chat_engine._predict_disease(symptoms)
        confidence = float(conf_val.replace('%', ''))

    # 2. Extract Suggestions & Medications (Doctor Side)
    # Common medical keywords for suggestions
    suggestion_keywords = ["take", "avoid", "rest", "drink", "apply", "use", "stop", "monitor", "come back", "visit"]
    suggestions = []
    
    # Simple sentence splitter
    sentences = doctor_text.split('.')
    for s in sentences:
        s = s.strip()
        if any(key in s.lower() for key in suggestion_keywords):
            suggestions.append(s)

    # 3. Extract Medications
    common_meds = ["paracetamol", "crocin", "dolo", "antibiotic", "amoxicillin", "cough syrup", "cetirizine", "aspirin", "insulin", "metformin", "omeprazole", "pantoprazole", "allegra", "zyrtec", "vicodin", "ibuprofen", "advil", "motrin", "tylenol"]
    meds_found = []
    for m in common_meds:
        if m in doctor_text.lower():
            # Try to catch dosage if nearby (simple regex)
            meds_found.append(m.capitalize())

    # Fallback if no specific doctor suggestions found
    if not suggestions and doctor_text:
        suggestions = [doctor_text.strip()]
        
    return jsonify({
        'condition': disease,
        'confidence': confidence,
        'symptoms_extracted': symptoms,
        'problems': symptoms,
        'suggestions': suggestions, 
        'medications': list(set(meds_found)),
        'summary': f"Patient reported: {', '.join(symptoms).replace('_', ' ')}. Doctor suggested: {'. '.join(suggestions[:2])}."
    })

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '')
    target_lang = data.get('target_lang', 'en').lower()
    source_lang = data.get('source_lang', 'auto').lower()

    # Normalize common full names to codes
    norm = {'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta', 'marathi': 'mr', 'bengali': 'bn'}
    
    if target_lang in norm:
        target_lang = norm[target_lang]
    else:
        target_lang = target_lang[:2]

    if source_lang != 'auto':
        if source_lang in norm:
            source_lang = norm[source_lang]
        else:
            source_lang = source_lang[:2]

    if not text:
        return jsonify({'error': 'No text provided'}), 400

    try:
        translated = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
        return jsonify({'translated': translated})
    except Exception as e:
        print(f"Translation Error (Dedicated): {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/translate_batch', methods=['POST'])
def translate_batch():
    data = request.json
    texts = data.get('texts', [])
    target_lang = data.get('target_lang', 'en').lower()
    source_lang = data.get('source_lang', 'auto').lower()

    # Normalize
    norm = {'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta', 'marathi': 'mr', 'bengali': 'bn'}
    
    if target_lang in norm:
        target_lang = norm[target_lang]
    else:
        target_lang = target_lang[:2]

    if source_lang != 'auto':
        if source_lang in norm:
            source_lang = norm[source_lang]
        else:
            source_lang = source_lang[:2]

    if not texts:
        return jsonify({'translations': []})

    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        # GoogleTranslator.translate can handle lists in some versions, 
        # but to be safe and consistent we loop here.
        translations = []
        for t in texts:
            if not t:
                translations.append('')
                continue
            translations.append(translator.translate(t))
            
        return jsonify({'translations': translations})
    except Exception as e:
        print(f"Batch Translation Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True)
