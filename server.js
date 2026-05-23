const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const { sendWhatsAppAlert, sendDailyCountdownDigest } = require('./services/whatsapp');
const { syncExamsWithGit } = require('./services/gitSync');

const app = express();
const PORT = process.env.PORT || 3000;
const EXAMS_FILE = path.join(__dirname, 'exams.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read exams file
function readExams() {
  try {
    if (!fs.existsSync(EXAMS_FILE)) {
      fs.writeFileSync(EXAMS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(EXAMS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading exams file:', error);
    return [];
  }
}

// Helper to write exams file
function writeExams(exams) {
  try {
    fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing exams file:', error);
    return false;
  }
}

// Auth middleware for admin routes
function verifyAdmin(req, res, next) {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin password' });
  }
  next();
}

// API Routes

// 1. Get all exams
app.get('/api/exams', (req, res) => {
  const exams = readExams();
  res.json(exams);
});

// 2. Add or Edit an Exam
app.post('/api/exams', verifyAdmin, async (req, res) => {
  const { exam } = req.body;
  
  if (!exam || !exam.name) {
    return res.status(400).json({ error: 'Bad Request: Exam name is required' });
  }

  const exams = readExams();
  let updatedExam;
  let isNew = false;

  if (exam.id) {
    // Edit existing
    const index = exams.findIndex(e => e.id === exam.id);
    if (index !== -1) {
      exams[index] = {
        ...exams[index],
        name: exam.name,
        link: exam.link || '',
        date: exam.date || '',
        category: exam.category || 'Other',
        description: exam.description || '',
      };
      updatedExam = exams[index];
    } else {
      return res.status(404).json({ error: 'Exam not found' });
    }
  } else {
    // Add new
    isNew = true;
    updatedExam = {
      id: Date.now().toString(),
      name: exam.name,
      link: exam.link || '',
      date: exam.date || '',
      category: exam.category || 'Other',
      description: exam.description || '',
      createdAt: new Date().toISOString()
    };
    exams.push(updatedExam);
  }

  const success = writeExams(exams);
  if (!success) {
    return res.status(500).json({ error: 'Database write failed' });
  }

  // Trigger background Git Push
  console.log('[Server] Exam updated/added. Triggering git sync in background...');
  let gitPushStatus = { success: true, pending: true };
  
  // We run git sync asynchronously so we don't block the API response
  syncExamsWithGit().then(gitResult => {
    console.log('[Server] Git sync completed in background:', gitResult);
  }).catch(err => {
    console.error('[Server] Background Git sync failed:', err);
  });

  res.json({
    message: isNew ? 'Exam added successfully!' : 'Exam updated successfully!',
    exam: updatedExam,
    gitSynced: gitPushStatus
  });
});

// 3. Delete an Exam
app.post('/api/exams/delete', verifyAdmin, async (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Bad Request: Exam ID is required' });
  }

  const exams = readExams();
  const index = exams.findIndex(e => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  exams.splice(index, 1);
  const success = writeExams(exams);
  
  if (!success) {
    return res.status(500).json({ error: 'Database write failed' });
  }

  // Trigger background Git Push
  console.log('[Server] Exam deleted. Triggering git sync in background...');
  syncExamsWithGit().then(gitResult => {
    console.log('[Server] Git sync completed in background:', gitResult);
  }).catch(err => {
    console.error('[Server] Background Git sync failed:', err);
  });

  res.json({
    message: 'Exam deleted successfully!',
    gitSynced: { success: true, pending: true }
  });
});

// 4. Test WhatsApp Notification
app.post('/api/whatsapp/test', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message body is required' });
  }

  const result = await sendWhatsAppAlert(message);
  if (result.success) {
    res.json({ message: 'WhatsApp message sent successfully!', response: result.response });
  } else {
    res.status(500).json({ error: 'Failed to send WhatsApp message', details: result.error });
  }
});

// 5. Trigger Daily Countdown Digest manually
app.post('/api/whatsapp/trigger-daily', async (req, res) => {
  const exams = readExams();
  const result = await sendDailyCountdownDigest(exams);
  if (result && result.success) {
    res.json({ message: 'Daily digest sent successfully!', response: result.response });
  } else {
    res.status(500).json({ 
      error: 'Failed to send daily digest', 
      details: result ? result.error : 'No active exams with dates' 
    });
  }
});

// Daily Cron Job Scheduler: Runs every day at 8:00 AM local time
// Cron Format: minute hour day-of-month month day-of-week
cron.schedule('0 8 * * *', async () => {
  console.log('[Scheduler] Running scheduled daily WhatsApp countdown check...');
  const exams = readExams();
  try {
    const result = await sendDailyCountdownDigest(exams);
    console.log('[Scheduler] Daily digest sent:', result);
  } catch (error) {
    console.error('[Scheduler Error] Failed to send daily digest:', error);
  }
});

// Serve the app
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Exam Countdown Tracker running at http://localhost:${PORT}`);
  console.log(`📅 Daily scheduler active: Runs every day at 08:00 AM`);
  console.log(`🔒 Admin Password is: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  console.log(`==================================================`);
});
