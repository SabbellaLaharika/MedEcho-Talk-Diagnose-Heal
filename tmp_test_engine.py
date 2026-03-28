
import pickle
import os
import sys

# Add ml_service to path
sys.path.append(os.path.join(os.getcwd(), 'ml_service'))

from chat_engine import ChatEngine

def test_engine():
    BASE_DIR = 'ml_service'
    MODEL_PATH = os.path.join(BASE_DIR, 'disease_model.pkl')
    SYMPTOMS_PATH = os.path.join(BASE_DIR, 'symptoms_list.pkl')

    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(SYMPTOMS_PATH, 'rb') as f:
        symptoms_list = pickle.load(f)

    engine = ChatEngine(symptoms_list, model)
    
    context = {}
    
    # Turn 1: hai
    print("User: hai")
    response, context = engine.process_message("hai", context)
    print(f"Bot: {response}")
    print(f"Context State: {context.get('state')}")
    
    # Turn 2: I am having fever and cough
    print("\nUser: I am having fever and cough")
    response, context = engine.process_message("I am having fever and cough", context)
    print(f"Bot: {response}")
    print(f"Context State: {context.get('state')}")
    print(f"Collected Symptoms: {context.get('collected_symptoms')}")

if __name__ == "__main__":
    test_engine()
