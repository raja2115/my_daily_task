require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const EXAMS_FILE = path.join(__dirname, 'public', 'exams.json');

function readExams() {
  if (!fs.existsSync(EXAMS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(EXAMS_FILE, 'utf8');
  return JSON.parse(data);
}

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use your specific provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function run() {
  console.log('Running daily email alert job');
  const exams = readExams();
  const today = new Date();
  
  let emailText = 'Here is your daily exam countdown alert:\n\n';
  let hasExams = false;

  exams.forEach(exam => {
    const examDate = new Date(exam.date);
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0) {
      emailText += `- ${exam.name}: ${diffDays} days remaining (Date: ${exam.date})\n`;
      emailText += `  Link: ${exam.link}\n\n`;
      hasExams = true;
    }
  });

  if (hasExams && process.env.RECEIVER_EMAIL) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.RECEIVER_EMAIL,
        subject: 'Daily Exam Countdown Alert',
        text: emailText
      });
      console.log('Daily alert email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      process.exit(1);
    }
  } else {
    console.log('No upcoming exams to report or RECEIVER_EMAIL not set.');
  }
}

run();
