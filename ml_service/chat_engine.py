import random
import pandas as pd
# Reload Trigger
from collections import Counter

class ChatEngine:
    def __init__(self, symptoms_list, model):
        self.symptoms_list = symptoms_list
        self.model = model
        
        # Simple keyword matching for symptoms (enhanced with basic fuzzy logic later if needed)
        self.symptom_map = {s.replace('_', ' ').lower(): s for s in symptoms_list}
        
        # Build Symptom Co-occurrence Matrix
        self.related_symptoms = self._build_symptom_correlations('dataset.csv')
        
        # Load Precautions
        self.precautions_map = self._load_precautions('precautions.csv')

    def _load_precautions(self, csv_path):
        """
        Reads precautions.csv and returns {disease: "Precaution 1, Precaution 2..."}
        """
        try:
            df = pd.read_csv(csv_path)
            # Create a dictionary where key=Disease, value=Combined String of columns
            precautions = {}
            for _, row in df.iterrows():
                disease = row['Disease'].strip()
                # Get non-null, non-empty precaution columns (Precaution_1 to Precaution_4)
                p_list = []
                for i in range(1, 5):
                     col_name = f'Precaution_{i}'
                     if col_name in row and pd.notna(row[col_name]):
                         p = str(row[col_name]).strip()
                         if p: p_list.append(p)
                
                precautions[disease] = ", ".join(p_list)
            return precautions
        except Exception as e:
            print(f"Error loading precautions: {e}")
            return {}

    def _build_symptom_correlations(self, csv_path):
        """
        Reads the dataset and finds which symptoms occur together most frequently.
        Returns a dict: {symptom: [related_symptom_1, related_symptom_2, ...]}
        """
        try:
            df = pd.read_csv(csv_path)
            # Get all symptom columns
            symptom_cols = [col for col in df.columns if 'Symptom' in col]
            
            # Map for co-occurrences
            co_occurrence = {s: Counter() for s in self.symptoms_list}
            
            for _, row in df.iterrows():
                # Get symptoms present in this row (disease instance)
                symptoms_in_row = []
                for col in symptom_cols:
                    # Cast value to string to avoid type index issues with Series[Any]
                    val = row[col]
                    s = str(val).strip()
                    if s and s != 'nan' and s in self.symptoms_list:
                        symptoms_in_row.append(s)
                
                # Bi-directional count
                for s1 in symptoms_in_row:
                    for s2 in symptoms_in_row:
                        if s1 != s2:
                            co_occurrence[s1][s2] += 1
                            
            # Convert to sorted list of top related symptoms
            related = {}
            for s, counter in co_occurrence.items():
                # Top 5 related symptoms
                related[s] = [pair[0] for pair in counter.most_common(5)]
                
            return related
            
        except Exception as e:
            print(f"Error building correlations: {e}")
            return {}

    def _parse_duration(self, text):
        import re
        match = re.search(r'\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple\s*of|few)\s+(hours?|days?|weeks?|months?|years?|weekend)\b', text)
        if match:
            qty, unit = match.groups()
            map_qty = {"a": "1", "an": "1", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10", "couple of": "2", "few": "3"}
            qty = map_qty.get(qty, qty)
            return f"{qty} {unit}"
        if "yesterday" in text: return "1 day"
        if "morning" in text: return "less than a day"
        return text.strip()

    def process_message(self, user_text, context):
        """
        Process user input and return (bot_response, updated_context)
        """
        user_text = user_text.lower()
        state = context.get('state', 'GREETING')
        collected_symptoms = context.get('collected_symptoms', [])
        history = context.get('history', {})
        
        # Questions to ask
        questions_map = {
            'duration': "How long have you been experiencing these symptoms?",
            'appetite': "How is your appetite lately?",
            'gastric': "Do you experience any acidity, gas, or stomach bloating?",
            'sleep': "How is your sleep quality?"
        }
        options_map = {
            'duration': ["1 day", "3 days", "1 week", "2 weeks"],
            'appetite': ["Good", "Average", "Poor"],
            'gastric': ["Yes", "No"],
            'sleep': ["Good", "Disturbed", "Insomnia"]
        }
        
        # --- State Machine ---
        
        # 1. GREETING / INITIAL
        if state == 'GREETING':
            # Generic conversational openers
            greetings = ["hello", "hi", "hey", "namaste", "good morning", "good evening", "bad", "unwell", "sick", "not well"]
            if any(word in user_text for word in greetings) or (user_text and user_text.strip()):
                context['state'] = 'GATHERING_SYMPTOMS'
                if any(word in user_text for word in ["bad", "unwell", "sick", "not well"]):
                     return "I am sorry to hear that. Please describe exactly what symptoms you are feeling (e.g., fever, cough, headache).", context
                return "Please tell me exactly what symptoms you are experiencing so I can assist you.", context
            else:
                context['state'] = 'GATHERING_SYMPTOMS'
                return "Please describe your symptoms to begin.", context

        # 2. SYMPTOM GATHERING
        if context.get('state') == 'GATHERING_SYMPTOMS':
            new_symptoms, negated_symptoms = self._extract_symptoms(user_text)
            
            # Handle Negations (Removing symptoms)
            removed = []
            for ns in negated_symptoms:
                if ns in collected_symptoms:
                    collected_symptoms.remove(ns)
                    removed.append(ns)
            
            if removed:
                context['collected_symptoms'] = collected_symptoms
                removed_str = ", ".join([s.replace('_', ' ') for s in removed])
                if not new_symptoms:
                    return f"Okay, I've removed **{removed_str}** from your list. What else are you experiencing?", context
                    
                if new_symptoms:
                    for s in new_symptoms:
                        if s not in collected_symptoms:
                            collected_symptoms.append(s)
                    context['collected_symptoms'] = collected_symptoms
                    
                    # Format symptom list for message (snake_case to natural/bold)
                    new_symptoms_str = " and ".join([f"**{s.replace('_', ' ')}**" for s in new_symptoms])
                    if len(new_symptoms) > 2:
                        new_symptoms_str = ", ".join([f"**{s.replace('_', ' ')}**" for s in new_symptoms[:-1]]) + f" and **{new_symptoms[-1].replace('_', ' ')}**"

                    # If we have enough symptoms, move to details
                    if len(collected_symptoms) >= 6 or any(word in user_text for word in ["done", "that's all", "nothing", "no more"]):
                         # Increased threshold to 6 to encourage more detail, or user says done
                        context['state'] = 'GATHERING_DETAILS'
                        first_q_key = list(questions_map.keys())[0]
                        context['pending_suggestions'] = options_map[first_q_key]
                        return f"I noted: {', '.join(collected_symptoms).replace('_', ' ')}. Now, {questions_map[first_q_key]}", context
                    else:
                        # SMART SUGGESTION LOGIC
                        # Base suggestions on the most recently added symptom
                        last_symptom = new_symptoms[-1] 
                        suggestions = self.related_symptoms.get(last_symptom, [])
                        
                        # Filter out already collected ones
                        canonical_suggestions = [s for s in suggestions if s not in collected_symptoms]
                        
                        if canonical_suggestions:
                            # Suggest up to 3 symptoms
                            suggest_list = canonical_suggestions[:3]
                            context['pending_suggestions'] = suggest_list
                            return f"I noted {new_symptoms_str}. Do you also experience any of the following? (Or select 'None')", context
                        else:
                            context.pop('pending_suggestions', None)
                            return f"I have noted {new_symptoms_str}. Do you have any other symptoms? (Or say 'that\\'s all')", context
                else:
                    # No new explicit symptoms found

                    # Check for "stop" words
                    stop_keywords = ["no", "done", "that's all", "none", "nothing", "nope", "not really", "other"]
                    if len(collected_symptoms) > 0 and any(word in user_text for word in stop_keywords):
                        context.pop('pending_suggestions', None)
                        if "other" in user_text.lower():
                            return "Please tell me exactly what those other symptoms are.", context
                        context['state'] = 'GATHERING_DETAILS'
                        first_q_key = list(questions_map.keys())[0]
                        context['pending_suggestions'] = options_map[first_q_key]
                        return f"Okay. Let's get some more details. {questions_map[first_q_key]}", context
                    
                    # Check for "continuation" or "confirmation" words 
                    continuation_keywords = ["yes", "yeah", "i have", "there are", "more", "ok", "okay", "unnayi", "avunu", "yep", "yup"] 
                    
                    if any(word in user_text for word in continuation_keywords):
                        pending = context.get('pending_suggestions', [])
                        if len(pending) == 1:
                            # Only 1 was suggested, safely assume 'yes' means this one
                            confirmed_symptom = pending[0]
                            if confirmed_symptom not in collected_symptoms:
                                collected_symptoms.append(confirmed_symptom)
                            context['collected_symptoms'] = collected_symptoms
                            context.pop('pending_suggestions', None)
                            
                            # Check threshold before suggesting another
                            if len(collected_symptoms) >= 6:
                                context['state'] = 'GATHERING_DETAILS'
                                first_q_key = list(questions_map.keys())[0]
                                context['pending_suggestions'] = options_map[first_q_key]
                                return f"Got it, noted **{confirmed_symptom.replace('_', ' ')}**. Now, {questions_map[first_q_key]}", context
                            
                            # Suggest the next ones based on newly confirmed symptom
                            next_suggestions = self.related_symptoms.get(confirmed_symptom, [])
                            next_canonical = [s for s in next_suggestions if s not in collected_symptoms]
                            
                            if next_canonical:
                                suggest_list = next_canonical[:3]
                                context['pending_suggestions'] = suggest_list
                                return f"Got it. Do you also experience any of these?", context
                            else:
                                return f"Got it, noted **{confirmed_symptom.replace('_', ' ')}**. Do you have any other symptoms?", context
                        elif len(pending) > 1:
                            return "Please select which exact symptoms you have from the list, or type 'None'.", context
                        else:
                            return "Please tell me what those symptoms are.", context

                    # FALLBACK: Use history to suggest if possible
                    if collected_symptoms:
                        last_symptom = collected_symptoms[-1]
                        suggestions = self.related_symptoms.get(last_symptom, [])
                        canonical_suggestions = [s for s in suggestions if s not in collected_symptoms]
                        
                        if canonical_suggestions:
                            suggest_list = canonical_suggestions[:3]
                            context['pending_suggestions'] = suggest_list
                            return f"I understand you're not feeling well. Based on your symptoms, do you also have any of these?", context

                    # If no symptoms yet and generic "unwell" input
                    unwell_keywords = ["not feeling good", "i am sick", "help me", "pain", "issue", "problem"]
                    if any(word in user_text for word in unwell_keywords):
                        return "I'm here to help. To give you an accurate assessment, I need to know specific symptoms. Are you experiencing things like Fever, Body Pain, or a Cough?", context

                return "I'm sorry, I didn't quite catch a specific symptom. Could you please name them directly? For example: 'I have a headache' or 'I feel nauseous'.", context

        # 3. GATHERING DETAILS (Smart Questioning)
        if context.get('state') == 'GATHERING_DETAILS':
            # Identify which question was just answered
            answered_key = None
            for key in questions_map.keys():
                if key not in history:
                    answered_key = key
                    break
            
            # Save answer
            if answered_key:
                if answered_key == 'duration':
                    history[answered_key] = self._parse_duration(user_text)
                else:
                    history[answered_key] = user_text
                context['history'] = history
            
            # Find NEXT question
            next_key = None
            for key in questions_map.keys():
                if key not in history:
                    next_key = key
                    break
            
            if next_key and next_key in questions_map:
                context['pending_suggestions'] = options_map[next_key]
                return questions_map[next_key], context
            else:
                # All questions answered -> DIAGNOSIS
                diagnosis, confidence = self._predict_disease(collected_symptoms)
                context['state'] = 'DIAGNOSIS'
                context['diagnosis'] = diagnosis
                context['confidence'] = confidence
                
                # Signal to frontend that report is ready
                context['final_report'] = True 
                
                # Get Precautions
                precautions = self.precautions_map.get(diagnosis, "Please consult a human doctor for confirmation.")
                context['precautions'] = precautions
                
                return f"Thank you. Based on your symptoms ({', '.join(collected_symptoms).replace('_', ' ')}) and history, I suspect **{diagnosis}** (Confidence: {confidence}).\n\n**Precautions:** {precautions}\n\nI am generating your medical report now.", context

        # 4. END STATE
        if state == 'DIAGNOSIS':
            if "start" in user_text or "hello" in user_text or "again" in user_text:
                context = {'state': 'GATHERING_SYMPTOMS', 'collected_symptoms': [], 'history': {}}
                return "Okay, let's start over. Tell me your symptoms.", context
            return "Your report has been generated. Please restart if you have new concerns.", context

        return "Error in conversation state.", context

    def _extract_symptoms(self, text):
        found = []
        negated = []
        import re
        import difflib
        
        text = text.lower()
        # Handle commas, slashes, and periods by treating them as word boundaries
        text = re.sub(r'[,/\.]', ' ', text)
        words = re.findall(r'\b\w+\b', text)
        negation_words = {"not", "no", "remove", "don", "dont", "without", "none", "neither", "didn", "didnt", "free"}
        
        for natural_name, key in self.symptom_map.items():
            match = False
            match_idx = -1
            
            # 1. Exact match (handle multi-word)
            if f" {natural_name} " in f" {text} " or f" {key.replace('_', ' ')} " in f" {text} ":
                match = True
            
            # 2. Token-based matching (e.g. "fever" in "high_fever")
            if not match:
                parts = natural_name.split()
                if all(p in words for p in parts):
                    match = True
                elif len(parts) > 1 and any(p in words for p in parts):
                    # Partial match for multi-word symptoms (e.g. "cough" matches "dry_cough")
                    # Only match if the partial word is descriptive enough (length > 3)
                    descriptive_parts = [p for p in parts if len(p) > 3]
                    if descriptive_parts and all(p in words for p in descriptive_parts):
                        match = True
            
            # 3. Fuzzy matching for misspellings
            if not match:
                length = len(natural_name.split())
                for i in range(len(words) - length + 1):
                    phrase = " ".join(words[i:i+length])
                    if difflib.get_close_matches(phrase, [natural_name], n=1, cutoff=0.85):
                        match = True
                        match_idx = i
                        break
            
            if match:
                # 4. Negation Check (Look at preceding 4 words)
                is_negated = False
                if match_idx == -1:
                    # Find where it matched in the words list
                    first_part = natural_name.split()[0]
                    for i, w in enumerate(words):
                        if w == first_part or (len(w) > 3 and w in natural_name):
                            match_idx = i
                            break
                            
                if match_idx > -1:
                    prev_words = words[max(0, match_idx-4):match_idx]
                    if any(nw in prev_words for nw in negation_words):
                        is_negated = True
                        
                if is_negated:
                    negated.append(key)
                else:
                    found.append(key)
                    
        return list(set(found)), list(set(negated))

    def _predict_disease(self, symptoms):
        if not self.model:
            return "Unknown", "0%"
            
        # Create vector
        input_vector = [0] * len(self.symptoms_list)
        for i, s in enumerate(self.symptoms_list):
            if s in symptoms:
                input_vector[i] = 1
        
        import numpy as np
        vector = np.array(input_vector).reshape(1, -1)
        pred = self.model.predict(vector)[0]
        probs = self.model.predict_proba(vector)
        conf = f"{np.max(probs)*100:.1f}%"
        
        return pred, conf
