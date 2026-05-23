import os
import json
import threading
import time
import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Import services
from services.whatsapp_service import send_whatsapp_alert, send_daily_countdown_digest
from services.git_service import sync_exams_with_git

load_dotenv()

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')
CORS(app)

EXAMS_FILE = os.path.join(os.path.dirname(__file__), 'exams.json')

def read_exams():
    try:
        if not os.path.exists(EXAMS_FILE):
            with open(EXAMS_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f, indent=2)
            return []
        with open(EXAMS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print("Error reading exams file:", e)
        return []

def write_exams(exams):
    try:
        with open(EXAMS_FILE, 'w', encoding='utf-8') as f:
            json.dump(exams, f, indent=2)
        return True
    except Exception as e:
        print("Error writing exams file:", e)
        return False

# Middleware/auth verification
def verify_admin(req_data):
    # Require user id "raja" and password "1114@"
    admin_user = "raja"
    admin_pass = "1114@"
    
    # Read from JSON body
    user_id = req_data.get('userId')
    password = req_data.get('password')
    
    if user_id == admin_user and password == admin_pass:
        return True
    return False

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# Serve other files directly if needed (fallback)
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# 1. Get all exams
@app.route('/api/exams', methods=['GET'])
def get_exams():
    return jsonify(read_exams())

# 2. Add or Edit an Exam
@app.route('/api/exams', methods=['POST'])
def save_exam():
    data = request.get_json() or {}
    if not verify_admin(data):
        return jsonify({"error": "Unauthorized: Invalid admin credentials"}), 401
        
    exam = data.get('exam')
    if not exam or not exam.get('name'):
        return jsonify({"error": "Bad Request: Exam name is required"}), 400
        
    exams = read_exams()
    updated_exam = None
    is_new = False
    
    exam_id = exam.get('id')
    if exam_id:
        # Edit existing
        found = False
        for i, e in enumerate(exams):
            if e['id'] == str(exam_id):
                exams[i] = {
                    "id": str(exam_id),
                    "name": exam.get('name'),
                    "link": exam.get('link', ''),
                    "date": exam.get('date', ''),
                    "category": exam.get('category', 'Other'),
                    "description": exam.get('description', ''),
                    "createdAt": e.get('createdAt', datetime.datetime.now().isoformat() + 'Z')
                }
                updated_exam = exams[i]
                found = True
                break
        if not found:
            return jsonify({"error": "Exam not found"}), 404
    else:
        # Add new
        is_new = True
        updated_exam = {
            "id": str(int(time.time() * 1000)),
            "name": exam.get('name'),
            "link": exam.get('link', ''),
            "date": exam.get('date', ''),
            "category": exam.get('category', 'Other'),
            "description": exam.get('description', ''),
            "createdAt": datetime.datetime.now().isoformat() + 'Z'
        }
        exams.append(updated_exam)
        
    if not write_exams(exams):
        return jsonify({"error": "Database write failed"}), 500
        
    # Trigger background git sync asynchronously
    print("[Server] Exam updated/added. Triggering git sync in background thread...")
    threading.Thread(target=sync_exams_with_git, daemon=True).start()
    
    return jsonify({
        "message": "Exam added successfully!" if is_new else "Exam updated successfully!",
        "exam": updated_exam,
        "gitSynced": {"success": True, "pending": True}
    })

# 3. Delete an Exam
@app.route('/api/exams/delete', methods=['POST'])
def delete_exam():
    data = request.get_json() or {}
    if not verify_admin(data):
        return jsonify({"error": "Unauthorized: Invalid admin credentials"}), 401
        
    exam_id = data.get('id')
    if not exam_id:
        return jsonify({"error": "Bad Request: Exam ID is required"}), 400
        
    exams = read_exams()
    original_len = len(exams)
    exams = [e for e in exams if e['id'] != str(exam_id)]
    
    if len(exams) == original_len:
        return jsonify({"error": "Exam not found"}), 404
        
    if not write_exams(exams):
        return jsonify({"error": "Database write failed"}), 500
        
    # Trigger background git sync
    print("[Server] Exam deleted. Triggering git sync in background thread...")
    threading.Thread(target=sync_exams_with_git, daemon=True).start()
    
    return jsonify({
        "message": "Exam deleted successfully!",
        "gitSynced": {"success": True, "pending": True}
    })

# 4. Test WhatsApp message
@app.route('/api/whatsapp/test', methods=['POST'])
def test_whatsapp():
    data = request.get_json() or {}
    message = data.get('message')
    if not message:
        return jsonify({"error": "Message body is required"}), 400
        
    result = send_whatsapp_alert(message)
    if result.get('success'):
        return jsonify({"message": "WhatsApp message sent successfully!", "response": result.get('response')})
    else:
        return jsonify({"error": "Failed to send WhatsApp message", "details": result.get('error')}), 500

# 5. Trigger Daily Countdown Digest manually
@app.route('/api/whatsapp/trigger-daily', methods=['POST'])
def manual_daily_digest():
    exams = read_exams()
    result = send_daily_countdown_digest(exams)
    if result and result.get('success'):
        return jsonify({"message": "Daily digest sent successfully!", "response": result.get('response')})
    else:
        error_msg = result.get('error') if result else 'No active exams with dates'
        return jsonify({"error": "Failed to send daily digest", "details": error_msg}), 500


# Background Thread Scheduler for 8:00 AM alerts
def run_daily_scheduler():
    print("[Scheduler Thread] Background daily alert scheduler running...")
    while True:
        try:
            now = datetime.datetime.now()
            # Runs daily at exactly 8:00 AM local time
            if now.hour == 8 and now.minute == 0:
                print(f"[Scheduler Thread] Time matches 08:00 AM. Sending countdown alerts...")
                exams_list = read_exams()
                res = send_daily_countdown_digest(exams_list)
                print(f"[Scheduler Thread] Digest result: {res}")
                # Wait 65 seconds so we don't trigger again in the same minute
                time.sleep(65)
            else:
                # Sleep 30 seconds and check again
                time.sleep(30)
        except Exception as e:
            print("[Scheduler Thread Exception]:", e)
            time.sleep(60)

# Start scheduler thread
scheduler_thread = threading.Thread(target=run_daily_scheduler, daemon=True)
scheduler_thread.start()


if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    print("==================================================")
    print(f"Server active: ApexExam Python Backend running at http://localhost:{port}")
    print("Daily scheduler active: Runs every day at 08:00 AM")
    print("Admin User is: 'raja' | Password: '1114@'")
    print("==================================================")
    app.run(host='0.0.0.0', port=port, debug=False)
