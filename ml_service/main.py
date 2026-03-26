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
        try:
            confidence = float(str(conf_val).replace('%', ''))
        except:
            confidence = 0

    # 2. Extract Suggestions & Medications
    suggestion_keywords = ["take", "avoid", "rest", "drink", "apply", "use", "stop", "monitor", "come back", "visit"]
    suggestions: list[str] = []
    doc_split = doctor_combined.split('.')
    for s in doc_split:
        clean_s = s.strip()
        if clean_s and any(key in clean_s.lower() for key in suggestion_keywords):
            suggestions.append(clean_s)

    common_meds = ["paracetamol", "crocin", "dolo", "antibiotic", "amoxicillin", "cough syrup", "cetirizine", "aspirin", "insulin", "metformin", "omeprazole", "pantoprazole", "allegra", "zyrtec", "vicodin", "ibuprofen", "advil", "motrin", "tylenol"]
    meds_found = []
    for m in common_meds:
        if m in doctor_combined.lower() or m in patient_combined.lower():
            meds_found.append(m.capitalize())

    if not suggestions and doctor_combined.strip():
        suggestions = [doctor_combined.strip()]
    
    # ── ADVANCED: Handle Uploaded Radiology/Pathology Reports ──
    # Physical reports don't have "Patient:" or "Doctor:" tags, so they fall into patient_combined
    # We look for IMPRESSION, CONCLUSION, DIAGNOSIS, or OPINION to give a patient-friendly summary
    import re
    radiology_summary = ""
    impression_match = re.search(r'(?:IMPRESSION|CONCLUSION|DIAGNOSIS|OPINION)\s*[:-]?\s*(.*?)(?=\n[A-Z]+[a-z]*\s*[:-]|\Z)', raw_text, re.IGNORECASE | re.DOTALL)
    
    if impression_match:
        extracted_impression = impression_match.group(1).strip()
        radiology_summary = f"Radiology/Pathology Findings: {extracted_impression}"
        # If no disease was predicted from symptoms, use the impression
        if disease == "Undetermined" and len(extracted_impression) > 3:
            flat_imp = extracted_impression.replace('\n', ' ')
            trunc_imp = ""
            for idx, char in enumerate(flat_imp):
                if idx >= 50: break
                trunc_imp += char
            disease = trunc_imp + "..."
            confidence = 85.0

    # Prepare final summary
    if radiology_summary:
        final_summary = f"📄 **Patient-Friendly Report Summary:**\n\n{radiology_summary}\n\nThe AI successfully analyzed your uploaded medical file. If you have any concerns about these findings, please consult your doctor."
    else:
        symptom_summary = ", ".join(symptoms).replace('_', ' ')
        top_suggestions_parts: list[str] = []
        for idx, sug in enumerate(suggestions):
            if idx >= 2: break
            top_suggestions_parts.append(sug)
        top_suggestions_str = ". ".join(top_suggestions_parts)
        if symptom_summary or top_suggestions_str:
             final_summary = f"Patient reported: {symptom_summary}. Doctor suggested: {top_suggestions_str}."
        else:
             final_summary = ""

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

@app.route('/extract-text', methods=['POST'])
def extract_text():
    """
    Accepts a base64-encoded file (PDF or image) and extracts readable text.
    Used by MedEcho to populate report templates with extracted content
    that can then be translated into the user's preferred language.

    Request JSON:
        { "file_base64": "<base64 string>", "mime_type": "application/pdf" | "image/png" | ... }

    Response JSON:
        { "text": "<extracted text>", "method": "pdf" | "ocr" | "none", "char_count": 1234 }
    """
    data = request.json or {}
    file_b64 = data.get('file_base64', '')
    mime_type = data.get('mime_type', '')

    if not file_b64:
        return jsonify({'error': 'No file_base64 provided'}), 400

    # Decode the base64 file content
    try:
        import base64
        file_bytes = base64.b64decode(file_b64)
    except Exception as e:
        return jsonify({'error': f'Invalid base64 data: {str(e)}'}), 400

    extracted_text = ''
    method_used = 'none'

    # ── PDF Text Extraction using pdfplumber + PyMuPDF OCR Fallback ──
    if 'pdf' in mime_type.lower():
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf_doc:
                pages_text = []
                for page in pdf_doc.pages:
                    page_text = page.extract_text()
                    if page_text:
                        pages_text.append(page_text.strip())
                extracted_text = '\n\n'.join(pages_text)
                method_used = 'pdf'
                print(f"[extract-text] PDF extracted {len(extracted_text)} chars from {len(pdf_doc.pages)} pages.")
        except Exception as e:
            print(f"[extract-text] pdfplumber error: {e}")

        # If PDF extraction yields very little text, it might be a SCANNED PDF.
        # Let's render the pages using PyMuPDF and OCR them!
        if len(extracted_text.strip()) < 50:
            print("[extract-text] Scanned PDF detected (low text count). Trying OCR with PyMuPDF + Tesseract...")
            try:
                import fitz  # PyMuPDF
                import pytesseract
                from PIL import Image
                import platform
                
                if platform.system() == 'Windows':
                    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

                pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
                ocr_pages = []
                for page_num in range(len(pdf_document)):
                    page = pdf_document.load_page(page_num)
                    # Render page to an image (scaling up for better OCR)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
                    import io
                    img_bytes = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_bytes))
                    
                    page_ocr = pytesseract.image_to_string(image, lang='eng')
                    if page_ocr:
                        ocr_pages.append(page_ocr.strip())
                        
                if ocr_pages:
                    extracted_text = '\n\n'.join(ocr_pages)
                    method_used = 'pdf_ocr'
                    print(f"[extract-text] PDF OCR extracted {len(extracted_text)} chars from {len(pdf_document)} pages.")
            except ImportError:
                print("[extract-text] fitz (PyMuPDF) or pytesseract missing. Cannot OCR scanned PDF.")
            except Exception as e:
                print(f"[extract-text] PDF OCR fallback failed: {e}")


    # ── Image Text Extraction using pytesseract (OCR) ────────────────
    elif mime_type.startswith('image/'):
        try:
            import pytesseract
            from PIL import Image, ImageOps
            import io
            import platform
            import re
            
            # Windows needs explicit path to tesseract.exe usually
            if platform.system() == 'Windows':
                # Common install location. If different, user should add to PATH manually
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
                
            image = Image.open(io.BytesIO(file_bytes))
            
            # 1. Correct any smartphone EXIF rotation tags
            try:
                image = ImageOps.exif_transpose(image)
            except Exception:
                pass
                
            # 2. Try to auto-detect purely visual sideways rotation via Tesseract OSD
            try:
                osd = pytesseract.image_to_osd(image)
                rot_match = re.search(r'Rotate:\s+(\d+)', osd)
                if rot_match:
                    rot = int(rot_match.group(1))
                    if rot != 0:
                        image = image.rotate(-rot, expand=True)
                        print(f"[extract-text] Auto-rotated image by {-rot} degrees via OSD.")
            except Exception as osd_err:
                print(f"[extract-text] OSD auto-rotate skipped: {osd_err}")

            # Use multiple languages: English + common Indian script support
            extracted_text = pytesseract.image_to_string(image, lang='eng')
            method_used = 'ocr'
            print(f"[extract-text] OCR extracted {len(extracted_text)} chars.")
        except ImportError:
            print("[extract-text] pytesseract/Pillow not installed, OCR skipped.")
        except Exception as e:
            print(f"[extract-text] OCR error: {e}")

    # ── Clean the extracted text ─────────────────────────────────────
    if extracted_text:
        import re
        # Remove excessive whitespace while preserving paragraph breaks
        extracted_text = re.sub(r'[ \t]+', ' ', extracted_text)       # collapse spaces
        extracted_text = re.sub(r'\n{3,}', '\n\n', extracted_text)    # max 2 blank lines
        extracted_text = re.sub(r'[^\S\n]+\n', '\n', extracted_text)  # trailing spaces
        extracted_text = extracted_text.strip()

    return jsonify({
        'text': extracted_text,
        'method': method_used,
        'char_count': len(extracted_text),
        'success': len(extracted_text) > 0
    })


if __name__ == '__main__':
    # Use 'PORT' provided by environment (Render), default to 8000
    port = int(os.environ.get("PORT", 8000))
    # Listen on 0.0.0.0 to accept external traffic on Render
    app.run(host='0.0.0.0', port=port, debug=False)
