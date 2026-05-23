import os
import re
import requests
import datetime
from dotenv import load_dotenv

load_dotenv()

def format_phone(phone, add_plus=False):
    cleaned = re.sub(r'\D', '', str(phone or ''))
    if len(cleaned) == 10:
        cleaned = '91' + cleaned  # Default to Indian country code
    return '+' + cleaned if add_plus else cleaned

def send_whatsapp_alert(text):
    provider = os.getenv('WHATSAPP_PROVIDER', 'log_only')
    phone_raw = os.getenv('WHATSAPP_PHONE', '9043389303')
    
    print(f"[WhatsApp Service] Attempting to send alert via provider: {provider}")
    
    # Write to a local log file (using utf-8 ensures file handles characters nicely)
    log_file = os.path.join(os.path.dirname(__file__), '..', 'whatsapp_sent_log.txt')
    timestamp = datetime.datetime.now().isoformat()
    log_entry = f"\n--- PYTHON SENT AT {timestamp} ---\nTo: {phone_raw}\nProvider: {provider}\nMessage:\n{text}\n--------------------------\n"
    
    try:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry)
    except Exception as e:
        print(f"[WhatsApp Service Error] Failed to write log: {e}")

    if provider == 'callmebot':
        api_key = os.getenv('CALLMEBOT_API_KEY')
        if not api_key or api_key.startswith('YOUR_'):
            print("[WhatsApp Warning] Callmebot API key is not configured in .env. Falling back to log_only.")
            return {"success": False, "error": "Callmebot API key not configured"}
        
        formatted_phone = format_phone(phone_raw, add_plus=False)
        url = f"https://api.callmebot.com/whatsapp.php?phone={formatted_phone}&text={requests.utils.quote(text)}&apikey={api_key}"
        
        try:
            response = requests.get(url, timeout=10)
            try:
                print("[WhatsApp Service] Callmebot Response:", response.text)
            except UnicodeEncodeError:
                print("[WhatsApp Service] Callmebot Response:", response.text.encode('ascii', errors='replace').decode('ascii'))
            return {"success": True, "response": response.text}
        except Exception as e:
            print("[WhatsApp Service Error] Callmebot failed:", str(e))
            return {"success": False, "error": str(e)}
            
    elif provider == 'twilio':
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_number = os.getenv('TWILIO_FROM_NUMBER')
        
        if not account_sid or account_sid.startswith('YOUR_') or not auth_token or auth_token.startswith('YOUR_'):
            print("[WhatsApp Warning] Twilio credentials are not configured in .env. Falling back to log_only.")
            return {"success": False, "error": "Twilio credentials not configured"}
            
        try:
            from twilio.rest import Client
            formatted_phone = format_phone(phone_raw, add_plus=True)
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=text,
                from_=f"whatsapp:{from_number}",
                to=f"whatsapp:{formatted_phone}"
            )
            print("[WhatsApp Service] Twilio Message SID:", message.sid)
            return {"success": True, "response": message.sid}
        except Exception as e:
            print("[WhatsApp Service Error] Twilio failed:", str(e))
            return {"success": False, "error": str(e)}
    else:
        try:
            print(f"[WhatsApp Log Mode] Message that would have been sent:\n{text}")
        except UnicodeEncodeError:
            safe_text = text.encode('ascii', errors='replace').decode('ascii')
            print(f"[WhatsApp Log Mode] Message that would have been sent:\n{safe_text}")
        return {"success": True, "response": "Logged successfully"}

def send_daily_countdown_digest(exams):
    active_exams = [e for e in exams if e.get('date') and e.get('date').strip() != '']
    
    if not active_exams:
        print('[WhatsApp Scheduler] No active exams with dates to alert.')
        return {"success": False, "error": "No active exams with target dates"}
        
    today = datetime.date.today()
    
    message = f"🔔 *Daily Exam Countdown Alert* 🔔\n\nHi Raj! Here is your daily exam status checklist:\n\n"
    has_pending = False
    
    for exam in active_exams:
        try:
            exam_date = datetime.datetime.strptime(exam['date'], '%Y-%m-%d').date()
            diff_days = (exam_date - today).days
            
            if diff_days > 0:
                time_string = f"⏳ *${diff_days} days remaining*"
            elif diff_days == 0:
                time_string = "⚡ *TODAY IS THE EXAM!* ⚡"
            else:
                time_string = f"❌ *Passed ${abs(diff_days)} days ago*"
                
            message += f"🔹 *{exam['name']}*\n{time_string}\n📅 Date: {exam['date']}\n🔗 Link: {exam.get('link') or 'N/A'}\n\n"
            has_pending = True
        except Exception as e:
            print(f"[WhatsApp Scheduler Error] Failed to parse date for {exam.get('name')}: {e}")
            
    if not has_pending:
        return {"success": False, "error": "Failed to parse exam countdowns"}
        
    message += "Keep studying hard! Consistency is the key to success. 🚀📚"
    return send_whatsapp_alert(message)
