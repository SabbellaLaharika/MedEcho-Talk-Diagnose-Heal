from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os
from chat_engine import ChatEngine
from deep_translator import GoogleTranslator
from langdetect import detect
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ── In-Memory Translation Cache ──────────────────────────────────────
# Format: { 'en->hi': { 'hello': 'नमस्ते' } }
_translation_cache: dict = {}
_cache_lock = threading.Lock()
_MAX_CACHE_SIZE = 2000  # per language pair

def _cache_key(source: str, target: str) -> str:
    return f"{source}->{target}"

def _get_cached(text: str, source: str, target: str) -> str | None:
    key = _cache_key(source, target)
    return _translation_cache.get(key, {}).get(text)

def _set_cached(text: str, translated: str, source: str, target: str):
    key = _cache_key(source, target)
    with _cache_lock:
        if key not in _translation_cache:
            _translation_cache[key] = {}
        bucket = _translation_cache[key]
        # Simple eviction: clear oldest half when too large
        if len(bucket) >= _MAX_CACHE_SIZE:
            count = 0
            limit = _MAX_CACHE_SIZE // 2
            evict_keys = []
            for k in bucket:
                if count >= limit:
                    break
                evict_keys.append(k)
                count += 1
            for k in evict_keys:
                del bucket[k]
        bucket[text] = translated

# Reusable thread pool for parallel translation
_executor = ThreadPoolExecutor(max_workers=8)

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

@app.route('/ping', methods=['GET'])
def ping():
    """Keep-alive endpoint to prevent cold starts from Render's free tier sleep."""
    return jsonify({'status': 'ok', 'cache_size': sum(len(v) for v in _translation_cache.values())})

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
            cached = _get_cached(user_text, detected_lang, 'en')
            if cached:
                english_text = cached
            else:
                english_text = GoogleTranslator(source=detected_lang, target='en').translate(user_text)
                _set_cached(user_text, english_text, detected_lang, 'en')
            print(f"Translated to English: {english_text}")
        except Exception as e:
            print(f"Translation Error (Input): {e}")
            english_text = user_text  # Fallback

    # 3. Process with Chat Engine (English)
    response_text_en, updated_context = chat_engine.process_message(english_text, context)
    
    # 4. Translate Response back to Target Language
    final_response_text = response_text_en
    if detected_lang != 'en':
        try:
            cached = _get_cached(response_text_en, 'en', detected_lang)
            if cached:
                final_response_text = cached
            else:
                final_response_text = GoogleTranslator(source='en', target=detected_lang).translate(response_text_en)
                _set_cached(response_text_en, final_response_text, 'en', detected_lang)
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
    
    # Use list accumulation for better type safety in some linters
    patient_data: list[str] = []
    doctor_data: list[str] = []
    
    # Safely handle input
    raw_text = str(transcript)
    lines = raw_text.strip().split('\n')
    
    for line in lines:
        clean_line = line.strip()
        if not clean_line: continue
        
        if clean_line.startswith('Patient:'):
            patient_data.append(clean_line.replace('Patient:', '').strip())
        elif clean_line.startswith('Doctor:'):
            doctor_data.append(clean_line.replace('Doctor:', '').strip())
        else:
            patient_data.append(clean_line)

    # Convert to strings
    patient_combined = " ".join(patient_data)
    doctor_combined = " ".join(doctor_data)

    # 1. Extract Problems (Patient Side)
    symptoms, _ = chat_engine._extract_symptoms(patient_combined.lower())
    disease = "Undetermined"
    confidence = 0
    if symptoms:
        disease, conf_val = chat_engine._predict_disease(symptoms)
        # Handle cases where confidence might be formatted differently
        try:
            confidence = float(str(conf_val).replace('%', ''))
        except:
            confidence = 0

    # 2. Extract Suggestions & Medications (Doctor Side)
    suggestion_keywords = ["take", "avoid", "rest", "drink", "apply", "use", "stop", "monitor", "come back", "visit"]
    suggestions: list[str] = []
    
    # Process doctor sentences
    doc_split = doctor_combined.split('.')
    for s in doc_split:
        clean_s = s.strip()
        if clean_s and any(key in clean_s.lower() for key in suggestion_keywords):
            suggestions.append(clean_s)

    # 3. Extract Medications
    common_meds = ["paracetamol", "crocin", "dolo", "antibiotic", "amoxicillin", "cough syrup", "cetirizine", "aspirin", "insulin", "metformin", "omeprazole", "pantoprazole", "allegra", "zyrtec", "vicodin", "ibuprofen", "advil", "motrin", "tylenol"]
    meds_found = []
    for m in common_meds:
        if m in doctor_combined.lower():
            meds_found.append(m.capitalize())

    # Fallback for suggestions
    if not suggestions and doctor_combined.strip():
        suggestions = [doctor_combined.strip()]
    
    # Prepare summary - use loop instead of slice to satisfy Pyre2 type checker
    symptom_summary = ", ".join(symptoms).replace('_', ' ')
    top_suggestions_parts: list[str] = []
    for idx, sug in enumerate(suggestions):
        if idx >= 2: break
        top_suggestions_parts.append(sug)
    top_suggestions_str = ". ".join(top_suggestions_parts)
    final_summary = f"Patient reported: {symptom_summary}. Doctor suggested: {top_suggestions_str}."
        
    return jsonify({
        'condition': disease,
        'confidence': confidence,
        'symptoms_extracted': symptoms,
        'problems': symptoms,
        'suggestions': suggestions, 
        'medications': list(set(meds_found)),
        'summary': final_summary
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
        translations = [''] * len(texts)
        to_translate: list[tuple[int, str]] = []  # (index, text)

        # 1. Fill from cache first
        for i, t in enumerate(texts):
            if not t or not t.strip():
                translations[i] = t
                continue
            if target_lang == 'en' and not any(ord(c) > 127 for c in t):
                translations[i] = t  # Already English ASCII, skip
                continue
            cached = _get_cached(t, source_lang, target_lang)
            if cached:
                translations[i] = cached
            else:
                to_translate.append((i, t))

        if not to_translate:
            return jsonify({'translations': translations})

        # 2. Translate uncached texts IN PARALLEL
        def _translate_one(idx: int, text: str) -> tuple:
            try:
                result = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
                return idx, text, result or text
            except Exception as e:
                print(f"Single translate error: {e}")
                return idx, text, text  # Fallback to original

        futures = [_executor.submit(_translate_one, i, t) for i, t in to_translate]  # type: ignore[arg-type]
        for future in as_completed(futures):
            idx, original, translated = future.result()
            translations[idx] = translated
            _set_cached(original, translated, source_lang, target_lang)

        return jsonify({'translations': translations})
    except Exception as e:
        print(f"Batch Translation Error: {e}")
        return jsonify({'translations': texts})

if __name__ == '__main__':
    # Use 'PORT' provided by environment (Render), default to 8000
    port = int(os.environ.get("PORT", 8000))
    # Listen on 0.0.0.0 to accept external traffic on Render
    app.run(host='0.0.0.0', port=port, debug=False)
