"""Quick Gemini status check"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

try:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content('Reply with SUCCESS')
    print('✅ GEMINI AI IS ACTIVE!')
    print(f'Model: gemini-2.0-flash')
    print(f'Response: {response.text}')
except Exception as e:
    print(f'❌ Gemini Unavailable: {type(e).__name__}')
    if 'ResourceExhausted' in str(type(e)):
        print('⏳ Quota exhausted - using fallback scoring')
    elif 'quota' in str(e).lower():
        print('⏳ Quota limit reached - using fallback scoring')
