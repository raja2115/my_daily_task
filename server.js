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
  if (!fs.existsSync(EXAMS_FILE)) return [];
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
      await git.push('origin', 'main');
      console.log('Successfully pushed changes to git repository');
    }
  } catch (error) {
    console.error('Error pushing to git:', error);
  }
}

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
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

  let emailHtml = `
  <div style="font-family:Inter,sans-serif;background:#0f172a;padding:30px;border-radius:16px;color:#f8fafc;">
    <h2 style="color:#60a5fa;">📅 Daily Exam Countdown Alert</h2>
    <p style="color:#94a3b8;">Here are your upcoming exams for today:</p>
    <hr style="border-color:#1e293b;"/>
  `;

  let hasExams = false;
  exams.forEach(exam => {
    const examDate = new Date(exam.date);
    const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      emailHtml += `
        <div style="background:#1e293b;border-radius:12px;padding:16px;margin:12px 0;">
          <h3 style="color:#f8fafc;margin:0 0 8px;">${exam.name}</h3>
          <p style="color:#3b82f6;font-size:2rem;font-weight:700;margin:0;">${diffDays} <span style="font-size:1rem;color:#94a3b8;">days left</span></p>
          <p style="color:#94a3b8;margin:4px 0;">Date: ${exam.date}</p>
          <a href="${exam.link}" style="color:#60a5fa;">Visit Website →</a>
        </div>
      `;
      hasExams = true;
    }
  });

  emailHtml += `</div>`;

  if (hasExams && process.env.RECEIVER_EMAIL) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.RECEIVER_EMAIL,
        subject: '📅 Daily Exam Countdown Alert',
        html: emailHtml
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

// POST add exam API (Admin only)
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
  await pushToGit();

  res.status(201).json({ message: 'Exam added successfully', exam: newExam });
});

// DELETE exam API (Admin only)
app.delete('/api/exams/:id', async (req, res) => {
  const { userId, password } = req.body;
  const adminId = process.env.ADMIN_ID || 'raja';
  const adminPass = process.env.ADMIN_PASS || '1114@';

  if (userId !== adminId || password !== adminPass) {
    return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
  }

  let exams = readExams();
  exams = exams.filter(e => e.id !== req.params.id);
  writeExams(exams);
  await pushToGit();

  res.json({ message: 'Exam deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`✅ Exam Tracker running at http://localhost:${PORT}`);
});
