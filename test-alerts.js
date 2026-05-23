const { sendDailyCountdownDigest, sendWhatsAppAlert } = require('./services/whatsapp');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const EXAMS_FILE = path.join(__dirname, 'exams.json');

async function test() {
  console.log('==================================================');
  console.log('📱 ApexExam Tracker - WhatsApp Alert Test Utility');
  console.log('==================================================');
  
  const provider = process.env.WHATSAPP_PROVIDER || 'log_only';
  const phone = process.env.WHATSAPP_PHONE || 'Not Set';
  
  console.log(`Current Configuration:`);
  console.log(`- Provider: ${provider}`);
  console.log(`- Recipient Phone: ${phone}`);
  
  if (provider === 'log_only') {
    console.log('\n[Notice] Provider is set to "log_only". To send actual messages, configure "callmebot" or "twilio" in .env.');
  }

  // 1. Send Simple Text Test
  console.log('\nSending test text message...');
  const textResult = await sendWhatsAppAlert('🔔 *ApexExam Test Alert*\nThis is a quick test of your WhatsApp notification integration. If you see this, your settings are correct! 🚀');
  
  if (textResult.success) {
    console.log('✅ Simple text test completed successfully.');
    console.log('Result:', textResult.response);
  } else {
    console.log('❌ Simple text test failed.');
    console.error('Error:', textResult.error);
  }

  // 2. Send Full Countdown Digest Test
  console.log('\nReading exams.json and sending full countdown digest...');
  try {
    if (!fs.existsSync(EXAMS_FILE)) {
      console.log('❌ exams.json does not exist. Skipping digest test.');
      return;
    }
    const exams = JSON.parse(fs.readFileSync(EXAMS_FILE, 'utf8'));
    const digestResult = await sendDailyCountdownDigest(exams);
    
    if (digestResult && digestResult.success) {
      console.log('✅ Countdown digest test completed successfully.');
      console.log('Result:', digestResult.response);
    } else {
      console.log('❌ Countdown digest test failed or skipped (no exams with target dates).');
      if (digestResult && digestResult.error) {
        console.error('Error:', digestResult.error);
      }
    }
  } catch (error) {
    console.error('❌ Digest test failed with exception:', error.message);
  }
  
  console.log('\n==================================================');
  console.log('Logs have been appended to: ./whatsapp_sent_log.txt');
  console.log('==================================================');
}

test();
