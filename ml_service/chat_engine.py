import random
import pandas as pd
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
                    s = str(row[col]).strip()
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
            'appetite': "How is your appetite lately? (Good/Average/Poor)",
            'gastric': "Do you experience any acidity, gas, or stomach bloating? (Yes/No)",
            'sleep': "How is your sleep quality? (Good/Disturbed/Insomnia)"
        }
        
        # --- State Machine ---
        
        # 1. GREETING / INITIAL
        if state == 'GREETING':
            if user_text and user_text.strip():
                context['state'] = 'GATHERING_SYMPTOMS'
                # Fall through...
            else:
                context['state'] = 'GATHERING_SYMPTOMS'
                return "Namaste! I am MedEcho. I can help diagnose your condition. Please describe your symptoms.", context

        # 2. SYMPTOM GATHERING
        if context.get('state') == 'GATHERING_SYMPTOMS':
            new_symptoms = self._extract_symptoms(user_text)
            
            if new_symptoms:
                for s in new_symptoms:
                    if s not in collected_symptoms:
                        collected_symptoms.append(s)
                context['collected_symptoms'] = collected_symptoms
                
                # If we have enough symptoms, move to details
                if len(collected_symptoms) >= 3 or "done" in user_text:
                     # Increased threshold to 3 to encourage more detail, or user says done
                    context['state'] = 'GATHERING_DETAILS'
                    first_q_key = list(questions_map.keys())[0]
                    return f"I noted: {', '.join(collected_symptoms).replace('_', ' ')}. Now, {questions_map[first_q_key]}", context
                else:
                    # SMART SUGGESTION LOGIC
                    last_symptom = new_symptoms[0] # Take one of the new ones
                    suggestions = self.related_symptoms.get(last_symptom, [])
                    
                    # Filter out already collected ones
                    valid_suggestions = [s.replace('_', ' ') for s in suggestions if s not in collected_symptoms]
                    
                    if valid_suggestions:
                        # Pick top 2-3
                        suggest_str = ", ".join(valid_suggestions[:3])
                        return f"I noted **{last_symptom.replace('_', ' ')}**. Do you also experience **{suggest_str}**? (Or tell me what else)", context
                    else:
                        return f"I have noted {', '.join(new_symptoms).replace('_', ' ')}. Do you have any other symptoms? (Or say 'that's all')", context
            else:
                # No symptoms found
                # Check for "stop" words
                if len(collected_symptoms) > 0 and ("no" in user_text or "done" in user_text or "that's all" in user_text or "nothing" in user_text):
                    context['state'] = 'GATHERING_DETAILS'
                    first_q_key = list(questions_map.keys())[0]
                    return f"Okay. Let's get some more details. {questions_map[first_q_key]}", context
                
                # Check for "continuation" words 
                continuation_keywords = ["yes", "yeah", "i have", "there are", "more", "ok", "okay", "unnayi", "avunu"] 
                
                if any(word in user_text for word in continuation_keywords):
                     return "Please tell me what those symptoms are.", context

                # FALLBACK: Use history to suggest if possible
                if collected_symptoms:
                    last_symptom = collected_symptoms[-1]
                    suggestions = self.related_symptoms.get(last_symptom, [])
                    valid_suggestions = [s.replace('_', ' ') for s in suggestions if s not in collected_symptoms]
                    
                    if valid_suggestions:
                         suggest_str = ", ".join(valid_suggestions[:3])
                         return f"I'm not sure I understood. Based on **{last_symptom.replace('_', ' ')}**, do you have **{suggest_str}**?", context

                return "I didn't catch a specific symptom in that. Could you name the symptom directly? (e.g., 'Headache', 'Fever')", context

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
                history[answered_key] = user_text
                context['history'] = history
            
            # Find NEXT question
            next_key = None
            for key in questions_map.keys():
                if key not in history:
                    next_key = key
                    break
            
            if next_key:
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
                precautions = self.precautions_map.get(diagnosis, "Please consult a doctor for advice.")
                
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
        # Naive matching: check if symptom string exists in user text
        # Improve this with NLP/fuzzy later
        for natural_name, key in self.symptom_map.items():
            # Check for exact matches or partials
            if natural_name in text or key in text:
                found.append(key)
            else:
                # Handle splitting "skin rash" -> "skin", "rash" checks
                parts = natural_name.split()
                if len(parts) > 1 and all(p in text for p in parts):
                    found.append(key)
        return list(set(found))

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
