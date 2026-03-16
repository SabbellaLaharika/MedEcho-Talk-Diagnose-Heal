from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import uvicorn
import os
from chat_engine import ChatEngine
import speech_recognition as sr
import shutil

app = FastAPI()
chat_engine = ChatEngine()

# Request Models
class ChatRequest(BaseModel):
    message: str
    history: list = [] # Not used in simple logic but good for future
    language: str = "en"
    state: dict = {} # Client should maintain state or send it back

@app.get("/")
def home():
    return {"message": "MedEcho ML Service Running"}

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        context = request.state or {}
        # process_message now handles translation internally
        response = chat_engine.process_message(request.message, context, request.language)
        
        return response
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stt")
async def speech_to_text(file: UploadFile = File(...), language: str = Form("en")):
    try:
        # Save temp file
        temp_filename = f"temp_{os.getpid()}.wav"
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_filename) as source:
            audio_data = recognizer.record(source)
            # Recognize speech using Google Speech Recognition
            # language param example: 'en-US', 'es-ES', 'fr-FR', 'hi-IN'
            text = recognizer.recognize_google(audio_data, language=language)
            
        os.remove(temp_filename)
        return {"text": text}
    except sr.UnknownValueError:
        return {"text": "", "error": "Could not understand audio"}
    except sr.RequestError as e:
        return {"text": "", "error": f"Speech Recognition unavailable: {e}"}
    except Exception as e:
        if os.path.exists(f"temp_{os.getpid()}.wav"):
            os.remove(f"temp_{os.getpid()}.wav")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
