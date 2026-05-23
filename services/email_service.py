import os
import smtplib
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

def send_email_alert(subject, html_content):
    receiver = os.getenv('EMAIL_RECEIVER')
    sender = os.getenv('SMTP_SENDER')
    password = os.getenv('SMTP_PASSWORD')
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    
    print(f"[Email Service] Attempting to send email alert to: {receiver}")
    
    if not receiver or not sender or not password or password.startswith('YOUR_'):
        print("[Email Warning] SMTP credentials or EMAIL_RECEIVER not configured in .env. Logging email content.")
        
        # Write to a local log file for offline testing/viewing
        log_file = os.path.join(os.path.dirname(__file__), '..', 'email_sent_log.html')
        timestamp = datetime.datetime.now().isoformat()
        log_entry = f"<!-- SENT AT {timestamp} TO {receiver} -->\n{html_content}\n<hr>\n"
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(log_entry)
            print(f"[Email Service] Email content logged to local file: {os.path.basename(log_file)}")
        except Exception as e:
            print(f"[Email Service Error] Failed to write local log: {e}")
            
        return {"success": True, "response": "Logged successfully (Offline Mode)"}
        
    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"ApexExam Alerts <{sender}>"
        msg['To'] = receiver
        
        # Attach HTML part
        msg.attach(MIMEText(html_content, 'html'))
        
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Upgrade connection to secure TLS
        server.login(sender, password)
        server.sendmail(sender, receiver, msg.as_string())
        server.quit()
        
        print("[Email Service] Email sent successfully!")
        return {"success": True, "response": "Email dispatched"}
    except Exception as e:
        print("[Email Service Error] Connection failed:", str(e))
        return {"success": False, "error": str(e)}

def send_daily_email_digest(exams):
    active_exams = [e for e in exams if e.get('date') and e.get('date').strip() != '']
    
    if not active_exams:
        print('[Email Scheduler] No active exams with dates to alert.')
        return {"success": False, "error": "No active exams with target dates"}
        
    today = datetime.date.today()
    receiver = os.getenv('EMAIL_RECEIVER', 'your_email@gmail.com')
    
    # Calculate rows
    rows_html = ""
    for exam in active_exams:
        try:
            exam_date = datetime.datetime.strptime(exam['date'], '%Y-%m-%d').date()
            diff_days = (exam_date - today).days
            
            # Choose color block based on urgency
            if diff_days > 0:
                if diff_days < 7:
                    status_color = "#ff0054"  # Urgent Red
                    status_text = f"⏳ ONLY {diff_days} DAYS LEFT!"
                elif diff_days < 30:
                    status_color = "#ffb703"  # Amber warning
                    status_text = f"⏳ {diff_days} days remaining"
                else:
                    status_color = "#00f5d4"  # Calm cyan
                    status_text = f"⏳ {diff_days} days remaining"
            elif diff_days == 0:
                status_color = "#25d366"  # Success Green
                status_text = "⚡ TODAY IS THE DAY! ⚡"
            else:
                status_color = "#9aa2b1"  # Grey passed
                status_text = f"Passed {abs(diff_days)} days ago"
                
            link_html = f'<a href="{exam["link"]}" target="_blank" style="color: #00e5ff; text-decoration: none; font-weight: bold;">Visit Portal &rarr;</a>' if exam.get("link") else "No Link"
            
            rows_html += f"""
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 16px 12px; font-weight: bold; color: #ffffff; font-size: 15px;">{exam['name']}</td>
                <td style="padding: 16px 12px; color: {status_color}; font-weight: bold; font-family: monospace; font-size: 14px;">{status_text}</td>
                <td style="padding: 16px 12px; color: #9aa2b1; font-size: 13px;">{exam['date']}</td>
                <td style="padding: 16px 12px; font-size: 13px;">{link_html}</td>
            </tr>
            """
        except Exception as e:
            print(f"[Email Digest Error] Failed to process {exam.get('name')}: {e}")

    # Build beautiful HTML body
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>ApexExam Status Checklist</title>
    </head>
    <body style="background-color: #090c15; color: #f1f3f9; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #101426; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 20px; margin-bottom: 25px;">
                <h1 style="color: #00e5ff; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Apex<span style="color: #9d4edd;">Exam</span> Alerts</h1>
                <p style="color: #9aa2b1; font-size: 13px; margin: 5px 0 0 0;">Your automatic daily exam countdown assistant</p>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #f1f3f9;">
                Hi Raj!<br>
                Here is your scheduled daily exam target countdown checklist. Keep consistent!
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 25px 0; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid rgba(255,255,255,0.12); color: #9aa2b1; font-size: 12px; text-transform: uppercase;">
                        <th style="padding: 10px 12px;">Exam</th>
                        <th style="padding: 10px 12px;">Countdown</th>
                        <th style="padding: 10px 12px;">Date</th>
                        <th style="padding: 10px 12px;">Link</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
            
            <div style="background-color: rgba(0,229,255,0.05); border: 1px dashed rgba(0,229,255,0.2); border-radius: 10px; padding: 16px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; font-size: 13px; color: #00e5ff; font-weight: bold;">
                    🚀 "Consistency is the key to success. Keep studying hard!" 📚
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #9aa2b1; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
                <p style="margin: 0;">This email is sent automatically to {receiver}.</p>
                <p style="margin: 5px 0 0 0;">ApexExam Dashboard // Git-synced exam tracker</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = "🔔 ApexExam Daily Countdown Alert Checklist 🔔"
    return send_email_alert(subject, html_content)
