import pickle
import os

SYMPTOMS_PATH = os.path.join(r'd:\final yr project\MedEcho-Talk-Diagnose-Heal', 'ml_service', 'symptoms_list.pkl')

if not os.path.exists(SYMPTOMS_PATH):
    print(f"File not found: {SYMPTOMS_PATH}")
else:
    with open(SYMPTOMS_PATH, 'rb') as f:
        symptoms = pickle.load(f)
    print(", ".join(sorted(symptoms)))
