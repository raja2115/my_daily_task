const axios = require('axios');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Clean and format the phone number
 * E.g., if "9043389303" is provided, converts it to "919043389303" (adds Indian country code if 10 digits)
 */
function formatPhone(phone, addPlus = false) {
  let cleaned = (phone || '').toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned; // Default to India country code
  }
  return addPlus ? '+' + cleaned : cleaned;
}

/**
 * Send WhatsApp Message
 * @param {string} text - Message body
 */
async function sendWhatsAppAlert(text) {
  const provider = process.env.WHATSAPP_PROVIDER || 'log_only';
  const phoneRaw = process.env.WHATSAPP_PHONE || '9043389303';
  
  console.log(`[WhatsApp Service] Attempting to send alert via provider: ${provider}`);
  
  // Always log to a local file for history/debugging
  const logFile = path.join(__dirname, '../whatsapp_sent_log.txt');
  const timestamp = new Date().toISOString();
  const logEntry = `\n--- SENT AT ${timestamp} ---\nTo: ${phoneRaw}\nProvider: ${provider}\nMessage:\n${text}\n--------------------------\n`;
  fs.appendFileSync(logFile, logEntry, 'utf8');

  if (provider === 'callmebot') {
    const apiKey = process.env.CALLMEBOT_API_KEY;
    if (!apiKey || apiKey.startsWith('YOUR_')) {
      console.warn('[WhatsApp Warning] Callmebot API key is not configured in .env. Falling back to console log.');
      return { success: false, error: 'Callmebot API key not configured' };
    }
    
    const formattedPhone = formatPhone(phoneRaw, false); // Callmebot doesn't want '+'
    const url = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;
    
    try {
      const response = await axios.get(url);
      console.log('[WhatsApp Service] Callmebot Response:', response.data);
      return { success: true, response: response.data };
    } catch (error) {
      console.error('[WhatsApp Service Error] Callmebot failed:', error.message);
      return { success: false, error: error.message };
    }
    
  } else if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    
    if (!accountSid || accountSid.startsWith('YOUR_') || !authToken || authToken.startsWith('YOUR_')) {
      console.warn('[WhatsApp Warning] Twilio credentials are not configured in .env. Falling back to console log.');
      return { success: false, error: 'Twilio credentials not configured' };
    }
    
    const formattedPhone = formatPhone(phoneRaw, true); // Twilio requires '+'
    const client = twilio(accountSid, authToken);
    
    try {
      const message = await client.messages.create({
        body: text,
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${formattedPhone}`
      });
      console.log('[WhatsApp Service] Twilio Message SID:', message.sid);
      return { success: true, response: message.sid };
    } catch (error) {
      console.error('[WhatsApp Service Error] Twilio failed:', error.message);
      return { success: false, error: error.message };
    }
    
  } else {
    console.log(`[WhatsApp Log Mode] Message that would have been sent:\n${text}`);
    return { success: true, response: 'Logged successfully' };
  }
}

/**
 * Computes remaining days for active exams and sends a digest
 * @param {Array} exams - List of exam objects
 */
async function sendDailyCountdownDigest(exams) {
  const activeExams = exams.filter(e => e.date && e.date.trim() !== '');
  
  if (activeExams.length === 0) {
    console.log('[WhatsApp Scheduler] No active exams with dates to alert.');
    return;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let message = `🔔 *Daily Exam Countdown Alert* 🔔\n\nHi Raj! Here is your daily exam status checklist:\n\n`;
  let hasPending = false;
  
  activeExams.forEach(exam => {
    const examDate = new Date(exam.date);
    examDate.setHours(0, 0, 0, 0);
    
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let timeString = '';
    if (diffDays > 0) {
      timeString = `⏳ *${diffDays} days remaining*`;
    } else if (diffDays === 0) {
      timeString = `⚡ *TODAY IS THE EXAM!* ⚡`;
    } else {
      timeString = `❌ *Passed ${Math.abs(diffDays)} days ago*`;
    }
    
    message += `🔹 *${exam.name}*\n${timeString}\n📅 Date: ${exam.date}\n🔗 Link: ${exam.link || 'N/A'}\n\n`;
    hasPending = true;
  });
  
  if (!hasPending) return;
  
  message += `Keep studying hard! Consistency is the key to success. 🚀📚`;
  
  return await sendWhatsAppAlert(message);
}

module.exports = {
  sendWhatsAppAlert,
  sendDailyCountdownDigest
};
