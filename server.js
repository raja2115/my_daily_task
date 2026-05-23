require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const simpleGit = require('simple-git');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const EXAMS_FILE = path.join(__dirname, 'exams.json');
const git = simpleGit();

// Helper to read exams
function readExams() {
  if (!fs.existsSync(EXAMS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(EXAMS_FILE, 'utf8');
  return JSON.parse(data);
}

// Helper to write exams
function writeExams(exams) {
  fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2));
}

// Auto git push function
async function pushToGit() {
  try {
    const status = await git.status();
    if (!status.isClean()) {
      await git.add('./exams.json');
      await git.commit('Auto-update: exams.json modified via admin panel');
      await git.push('origin', 'main'); // Change 'main' to your branch name if different
      console.log('Successfully pushed changes to git repository');
    }
  } catch (error) {
    console.error('Error pushing to git:', error);
  }
}

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Daily Cron Job at 9:00 AM to send countdown emails
cron.schedule('0 9 * * *', async () => {
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
    }
  }
});

// GET exams API
app.get('/api/exams', (req, res) => {
  const exams = readExams();
  res.json(exams);
});

// POST exams API (Admin)
app.post('/api/exams', async (req, res) => {
  const { userId, password, name, link, date } = req.body;
  
  const adminId = process.env.ADMIN_ID || 'raja';
  const adminPass = process.env.ADMIN_PASS || '1114@';

  if (userId !== adminId || password !== adminPass) {
    return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
  }

  if (!name || !link || !date) {
    return res.status(400).json({ error: 'Name, link, and date are required' });
  }

  const exams = readExams();
  const newExam = {
    id: Date.now().toString(),
    name,
    link,
    date
  };
  
  exams.push(newExam);
  writeExams(exams);

  // Push updated json to git
  await pushToGit();

  res.status(201).json({ message: 'Exam added successfully', exam: newExam });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
