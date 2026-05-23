import os
import json
from dotenv import load_dotenv
from services.whatsapp_service import send_whatsapp_alert, send_daily_countdown_digest

load_dotenv()

def test():
    print('==================================================')
    print('ApexExam Tracker - Python Alert Test Utility')
    print('==================================================')
    
    provider = os.getenv('WHATSAPP_PROVIDER', 'log_only')
    phone = os.getenv('WHATSAPP_PHONE', 'Not Set')
    
    print(f"Current Configuration:")
    print(f"- Provider: {provider}")
    print(f"- Recipient Phone: {phone}")
    
    if provider == 'log_only':
        print('\n[Notice] Provider is set to "log_only". To send actual messages, configure "callmebot" in .env.')

    # 1. Send Simple Text Test
    print('\nSending test text message...')
    text_result = send_whatsapp_alert('🔔 *ApexExam Python Alert*\nThis is a quick test of your Python WhatsApp notification integration. If you see this, your settings are correct! 🚀')
    
    if text_result.get('success'):
        print('[OK] Simple text test completed successfully.')
        print('Result:', text_result.get('response'))
    else:
        print('[FAIL] Simple text test failed.')
        print('Error:', text_result.get('error'))

    # 2. Send Full Countdown Digest Test
    print('\nReading exams.json and sending full countdown digest...')
    try:
        exams_file = os.path.join(os.path.dirname(__file__), 'exams.json')
        if not os.path.exists(exams_file):
            print('[FAIL] exams.json does not exist. Skipping digest test.')
            return
            
        with open(exams_file, 'r', encoding='utf-8') as f:
            exams = json.load(f)
            
        digest_result = send_daily_countdown_digest(exams)
        
        if digest_result and digest_result.get('success'):
            print('[OK] Countdown digest test completed successfully.')
            print('Result:', digest_result.get('response'))
        else:
            print('[FAIL] Countdown digest test failed or skipped (no exams with target dates).')
            if digest_result and digest_result.get('error'):
                print('Error:', digest_result.get('error'))
    except Exception as error:
        print('[FAIL] Digest test failed with exception:', str(error))
        
    print('\n==================================================')
    print('Logs have been appended to: ./whatsapp_sent_log.txt')
    print('==================================================')

if __name__ == "__main__":
    test()
