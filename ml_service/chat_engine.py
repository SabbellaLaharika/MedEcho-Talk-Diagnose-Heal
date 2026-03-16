import random
import json
import os
import pickle
import numpy as np
import base64
<<<<<<< HEAD
import pyttsx3

# Try to import googletrans, fall back to mock if it fails
try:
    from googletrans import Translator
    GOOGLETRANS_AVAILABLE = True
except Exception as e:
    print(f"Warning: googletrans not available ({e}), using mock translator")
    GOOGLETRANS_AVAILABLE = False
    
    class Translator:
        """Mock translator - returns text as-is"""
        def translate(self, text, src=None, dest=None):
            class Translation:
                def __init__(self, text):
                    self.text = text
            return Translation(text)
        
        def detect(self, text):
            class Detection:
                lang = 'en'
            return Detection()

=======
from googletrans import Translator
import pyttsx3

>>>>>>> 26fb91a424690380f5fc5fcabc7db33ed75eebe6
# Load Model & Vectorizer
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model/model.pkl')
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), 'model/vectorizer.pkl')

model = None
symptoms_list = None

def load_model():
    global model, symptoms_list
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
            with open(VECTORIZER_PATH, 'rb') as f:
                symptoms_list = pickle.load(f)
            print("Model loaded successfully.")
            return True
    except Exception as e:
        print(f"Error loading model: {e}")
    return False

# Initialize model
load_model()

class ChatEngine:
    def __init__(self):
        self.translator = Translator()
        # Initialize TTS engine once if possible, or per request if thread safety is an issue.
        # pyttsx3 is not always thread safe. For a simple project, we'll try global or new instance.
    
    def translate_to_english(self, text, src_lang):
        if src_lang == 'en':
            return text
        try:
            translation = self.translator.translate(text, src=src_lang, dest='en')
            return translation.text
        except Exception as e:
            print(f"Translation Error (to EN): {e}")
            return text

    def translate_from_english(self, text, dest_lang):
        if dest_lang == 'en':
            return text
        try:
            translation = self.translator.translate(text, src='en', dest=dest_lang)
            return translation.text
        except Exception as e:
            print(f"Translation Error (from EN): {e}")
            return text

    def text_to_speech_base64(self, text):
        try:
            # We need to save to a file and read it back as base64
            # Generate a unique filename to avoid collisions
            filename = f"tts_{os.getpid()}_{random.randint(0, 10000)}.mp3"
            
            engine = pyttsx3.init()
            engine.save_to_file(text, filename)
            engine.runAndWait() # Process the command
            
            if os.path.exists(filename):
                with open(filename, "rb") as audio_file:
                    encoded_string = base64.b64encode(audio_file.read()).decode('utf-8')
                os.remove(filename) # Cleanup
                return encoded_string
        except Exception as e:
            print(f"TTS Error: {e}")
        return None

    def process_message(self, message, context, language_fallback='en'):
        """
        context: {
          'state': 'START' | 'COLLECTING',
          'collected_symptoms': [],
          'user_data': {}
        }
        """
        # Detect language dynamically
        language = language_fallback
        try:
            detected = self.translator.detect(message)
            if detected and hasattr(detected, 'lang'):
                language = detected.lang[:2] # get primary lang code like 'en', 'fr', 'es'
        except Exception as e:
            print(f"Language detection failed: {e}")

        # 1. Translate Input to English
        english_message = self.translate_to_english(message, language)
        print(f"Original: {message} ({language}) -> English: {english_message}")

        state = context.get('state', 'START')
        collected_symptoms = context.get('collected_symptoms', [])
        
        response_data = {}
        english_response_text = ""
        
        # --- LOGIC START ---
        if state == 'START':
            english_response_text = "Hello! I am MedEcho. Please describe your symptoms."
            response_data['next_state'] = 'COLLECTING'
            
        elif state == 'COLLECTING':
            found_symptoms = []
            if symptoms_list:
                # Normalize message
                clean_message = english_message.lower().strip()
                
                for sym in symptoms_list:
                    # Normalize symptom from DB (e.g., 'skin_rash' -> 'skin rash')
                    clean_sym = sym.replace('_', ' ').lower()
                    
                    # Check for exact match or if symptom words appear in message
                    # Also handle single-word symptoms carefully to avoid false positives if needed
                    if clean_sym in clean_message:
                        found_symptoms.append(sym)
                    elif sym.lower() in clean_message: # Fallback check for underscore version
                         found_symptoms.append(sym)
            
            # Debug print
            print(f"Symptoms found in '{english_message}': {found_symptoms}")
            
            if found_symptoms:
                collected_symptoms.extend(found_symptoms)
                collected_symptoms = list(set(collected_symptoms))
                
                symptoms_display = ', '.join([s.replace('_', ' ') for s in found_symptoms])
                english_response_text = f"I've noted {symptoms_display}. Do you have any other symptoms? If not, say 'no' or 'done'."
                response_data['collected_symptoms'] = collected_symptoms
                response_data['next_state'] = 'COLLECTING'
                
            elif "no" in english_message.lower() or "done" in english_message.lower() or "nothing" in english_message.lower():
                 if not collected_symptoms:
                     english_response_text = "I haven't caught any symptoms yet. Please describe what you are feeling."
                     response_data['next_state'] = 'COLLECTING'
                 else:
                     # Proceed to diagnosis
                     diagnosis, confidence = self.predict_disease(collected_symptoms)
                     precautions = self.get_precautions(diagnosis)
                     
                     english_response_text = f"Based on your symptoms, it looks like you might have {diagnosis}. Confidence: {confidence:.2f}%. Precautions: {', '.join(precautions)}."
                     response_data['diagnosis'] = diagnosis
                     response_data['confidence'] = confidence
                     response_data['precautions'] = precautions
                     response_data['next_state'] = 'END'
            else:
                english_response_text = "I didn't catch that. Could you describe your symptoms again?"
                response_data['next_state'] = 'COLLECTING'
                
        elif state == 'END':
            english_response_text = "The consultation is complete. A report has been generated."
            response_data['next_state'] = 'END'
        # --- LOGIC END ---

        # 2. Translate Response back to Target Language
        translated_response = self.translate_from_english(english_response_text, language)
        response_data['message'] = translated_response
        
        # 3. Generate Audio (TTS) for the translated response
        audio_base64 = self.text_to_speech_base64(translated_response)
        if audio_base64:
            response_data['audio'] = audio_base64

        return response_data

    def predict_disease(self, symptoms):
        if not model or not symptoms_list:
            return "Unknown (Model not loaded)", 0.0

        # Create input vector
        vector = [0] * len(symptoms_list)
        for sym in symptoms:
            if sym in symptoms_list:
                idx = symptoms_list.index(sym)
                vector[idx] = 1
        
        input_data = np.array([vector])
        prediction = model.predict(input_data)[0]
        # Check if predict_proba is supported
        if hasattr(model, "predict_proba"):
            confidence = np.max(model.predict_proba(input_data)) * 100
        else:
            confidence = 100.0 # Fallback
        
        return prediction, confidence

    def get_precautions(self, disease):
        # Placeholder dictionary
        precautions_db = {
            'Fungal infection': ['bath twice', 'use detol or neem soap', 'keep infected area dry'],
            'Allergy': ['apply calamine', 'cover area with bandage', 'use ice to compress itching'],
            'GERD': ['avoid fatty spicy food', 'avoid lying down after eating', 'maintain healthy weight'],
            'Chronic cholestasis': ['cold baths', 'anti itch medicine', 'consult doctor'],
            'Drug Reaction': ['stop irritation', 'consult nearest hospital', 'stop taking drug'],
            'Peptic ulcer diseae': ['avoid fatty spicy food', 'consume probiotic food', 'eliminate milk'],
            'AIDS': ['avoid open cuts', 'wear ppe if possible', 'consult doctor', 'follow antiretroviral therapy'],
            'Diabetes': ['have balanced diet', 'exercise every day', 'consult doctor', 'monitor blood sugar'],
            'Gastroenteritis': ['stop eating solid food for a while', 'sip water', 'rest'],
            'Bronchial Asthma': ['switch to loose clothing', 'take deep breaths', 'get away from trigger'],
            'Hypertension': ['meditation', 'salt baths', 'reduce stress', 'get proper sleep'],
            'Migraine': ['meditation', 'consult doctor', 'reduce stress', 'use poloroid glasses in sun'],
            'Cervical spondylosis': ['use heating pad or cold pack', 'exercise', 'take otc pain reliver', 'consult doctor'],
            'Paralysis (brain hemorrhage)': ['massage', 'eat healthy', 'exercise', 'consult doctor'],
            'Jaundice': ['drink plenty of water', 'consume milk thistle', 'eat fruits and high fiber food', 'medication'],
            'Malaria': ['Consult Doctor (Urgent)', 'avoid mosquito bites', 'antimalarial drugs', 'keep hydrated'],
            'Chicken pox': ['use neem in bathing', 'consume neem leaves', 'take vaccine', 'avoid public places'],
            'Dengue': ['drink papaya leaf juice', 'avoid mosquito bites', 'keep hydrated', 'monitor platelets'],
            'Typhoid': ['eat high calorie vegitables', 'antibiottic therapy', 'consult doctor', 'avoid oily food'],
            'hepatitis A': ['Consult Doctor', 'wash hands', 'avoid contaminated water', 'vaccination'],
            'Hepatitis B': ['consult doctor', 'vaccination', 'eat healthy', 'medication'],
            'Hepatitis C': ['Consult Doctor', 'vaccination', 'eat healthy', 'medication'],
            'Hepatitis D': ['Consult Doctor', 'vaccination', 'eat healthy', 'medication'],
            'Hepatitis E': ['Consult Doctor', 'rest', 'eat healthy', 'medication'],
            'Alcoholic hepatitis': ['stop alcohol consumption', 'consult doctor', 'medication'],
            'Tuberculosis': ['cover mouth', 'consult doctor', 'medication', 'rest'],
            'Common Cold': ['drink vitamin c rich drinks', 'take vapour', 'avoid cold food', 'keep fever in check'],
            'Pneumonia': ['consult doctor', 'medication', 'rest', 'warm fluids'],
            'Dimorphic hemmorhoids(piles)': ['avoid spicy food', 'consume witch hazel', 'warm baths with epsom salt', 'consume alovera juice'],
            'Heart attack': ['call ambulance', 'chew aspirin', 'keep calm'],
            'Varicose veins': ['lie down flat and raise the leg high', 'use oinments', 'use vein compression', 'dont stand still for long'],
            'Hypothyroidism': ['reduce stress', 'exercise', 'eat healthy', 'get proper sleep'],
            'Hyperthyroidism': ['eat healthy', 'massage', 'use lemon balm', 'take radioactive iodine treatment'],
            'Hypoglycemia': ['eat high sugar food', 'consult doctor', 'monitor blood sugar'],
            'Osteoarthristis': ['acetaminophen', 'consult doctor', 'blocking prostaglandins', 'set proper bedding'],
            'Arthritis': ['exercise', 'use hot and cold therapy', 'try acupuncture', 'massage'],
            '(vertigo) Paroymsal  Positional Vertigo': ['lie down', 'avoid sudden movements', 'vitamin d', 'drink water'],
            'Acne': ['bath twice', 'avoid fatty spicy food', 'drink plenty of water', 'avoid too many products'],
            'Urinary tract infection': ['drink plenty of water', 'increase vitamin c intake', 'drink cranberry juice', 'take probiotics'],
            'Psoriasis': ['wash hands with warm soapy water', 'stop bleeding using pressure', 'consult doctor', 'salt baths'],
            'Impetigo': ['soak scabs in warm water', 'antibiotic ointment', 'consult doctor', 'remove scabs with wet cloth']
        }
        return precautions_db.get(disease, ['Consult a doctor', 'Rest well', 'Drink plenty of water'])
