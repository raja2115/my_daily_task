let examsData = [];

async function loadExams() {
  const loading = document.getElementById('loading');
  const container = document.getElementById('exam-container');

  try {
    const res = await fetch('/api/exams');
    examsData = await res.json();
    loading.style.display = 'none';
    renderExams();
  } catch (err) {
    loading.innerHTML = '<p style="color:#ef4444;">⚠️ Could not load exams. Is the server running?</p>';
  }
}

function renderExams() {
  const container = document.getElementById('exam-container');
  container.innerHTML = '';

  if (!examsData.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>No exams yet!</h2>
        <p>Go to the <a href="admin.html" style="color:#60a5fa;">Admin Panel</a> to add your first exam.</p>
      </div>`;
    return;
  }

  const today = new Date();
  const sorted = [...examsData].sort((a, b) => new Date(a.date) - new Date(b.date));

  sorted.forEach((exam, i) => {
    const examDate = new Date(exam.date);
    const diffMs = examDate - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let daysNum = diffDays < 0 ? 0 : diffDays;
    let daysLabel = diffDays < 0 ? 'Exam Passed' : diffDays === 0 ? 'TODAY!' : 'Days Left';

    // Progress bar: assume max 365 days
    const totalDays = 365;
    const elapsed = Math.max(0, totalDays - daysNum);
    const pct = Math.min(100, (elapsed / totalDays) * 100);

    const card = document.createElement('div');
    card.className = 'exam-card';
    card.style.animationDelay = `${i * 0.08}s`;
    card.innerHTML = `
      <div class="exam-name">${exam.name}</div>
      <div class="exam-date-label">📅 ${new Date(exam.date).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</div>
      <div class="countdown">
        <div class="days-num">${daysNum}</div>
        <div class="days-label">${daysLabel}</div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>
      <a class="exam-link" href="${exam.link}" target="_blank" rel="noopener">🔗 Visit Official Website</a>
    `;
    container.appendChild(card);
  });
}

// ── Chatbot ──────────────────────────────────────
function toggleChat() {
  const win = document.getElementById('chatbot-window');
  win.classList.toggle('open');
  document.getElementById('toggle-icon').textContent = win.classList.contains('open') ? '✕' : '💬';
}

document.getElementById('chatbot-toggle').addEventListener('click', toggleChat);

function addMsg(text, isUser) {
  const msgs = document.getElementById('chat-msgs');
  const div = document.createElement('div');
  div.className = 'msg ' + (isUser ? 'user' : 'bot');
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function handleChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  addMsg(text, true);
  input.value = '';

  const lower = text.toLowerCase();
  setTimeout(() => {
    if (!examsData.length) { addMsg("You have no exams added yet. Visit the Admin Panel to add some!", false); return; }

    if (lower.includes('next') || lower.includes('closest')) {
      const upcoming = examsData
        .map(e => ({ ...e, days: Math.ceil((new Date(e.date) - new Date()) / 86400000) }))
        .filter(e => e.days >= 0)
        .sort((a, b) => a.days - b.days)[0];
      if (upcoming) addMsg(`📌 Your next exam is "${upcoming.name}" in ${upcoming.days} days!`, false);
      else addMsg('All your exams have passed! Add new ones from the Admin Panel.', false);
    } else if (lower.includes('how many') || lower.includes('days left') || lower.includes('days remain')) {
      const list = examsData
        .map(e => ({ ...e, days: Math.ceil((new Date(e.date) - new Date()) / 86400000) }))
        .filter(e => e.days >= 0)
        .sort((a, b) => a.days - b.days);
      if (!list.length) { addMsg('All your exams have passed!', false); return; }
      addMsg(list.map(e => `📚 ${e.name}: ${e.days} days left`).join('\n'), false);
    } else if (lower.includes('list') || lower.includes('all exam')) {
      addMsg('📋 Your exams:\n' + examsData.map(e => `• ${e.name} — ${e.date}`).join('\n'), false);
    } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      addMsg('Hello! 👋 I can tell you about your upcoming exams. Try asking "Next exam?" or "Days left?"', false);
    } else {
      // Try to match exam name in message
      const found = examsData.find(e => lower.includes(e.name.toLowerCase().substring(0, 5)));
      if (found) {
        const days = Math.ceil((new Date(found.date) - new Date()) / 86400000);
        addMsg(`📚 ${found.name} is on ${found.date} — ${days >= 0 ? days + ' days left' : 'already passed'}.`, false);
      } else {
        addMsg('I can help you with exam dates and countdowns. Try "Next exam?" or "List all exams"!', false);
      }
    }
  }, 350);
}

document.getElementById('chat-send').addEventListener('click', handleChat);
document.getElementById('chat-input').addEventListener('keypress', e => { if (e.key === 'Enter') handleChat(); });

loadExams();
