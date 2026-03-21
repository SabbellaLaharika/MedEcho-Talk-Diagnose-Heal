from deep_translator import GoogleTranslator
words = ["Dashboard", "Doctor", "Patient", "Records"]
for w in words:
    hi = GoogleTranslator(source='en', target='hi').translate(w)
    te = GoogleTranslator(source='en', target='te').translate(w)
    print(f"{w} -> HI: {hi}, TE: {te}")
