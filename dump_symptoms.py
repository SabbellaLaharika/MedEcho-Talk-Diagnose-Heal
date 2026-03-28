
import pickle
import os

BASE_DIR = 'ml_service'
SYMPTOMS_PATH = os.path.join(BASE_DIR, 'symptoms_list.pkl')

with open(SYMPTOMS_PATH, 'rb') as f:
    symptoms_list = pickle.load(f)

print(f"Symptoms ({len(symptoms_list)}):")
for s in sorted(symptoms_list):
    print(f"- {s}")
