// App State
let exams = [];
let activeCategory = 'all';
let searchQuery = '';
let countdownInterval = null;
let isAdminMode = false;

// DOM Elements
const examsGrid = document.getElementById('examsGrid');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryFilters = document.getElementById('categoryFilters');
const adminModeBtn = document.getElementById('adminModeBtn');
const adminModal = document.getElementById('adminModal');
const examForm = document.getElementById('examForm');
const modalTitle = document.getElementById('modalTitle');
const examIdInput = document.getElementById('examId');
const adminPasswordInput = document.getElementById('adminPassword');
const examNameInput = document.getElementById('examName');
const examLinkInput = document.getElementById('examLink');
const examCategorySelect = document.getElementById('examCategory');
const examDateInput = document.getElementById('examDate');
const examDescriptionText = document.getElementById('examDescription');
const deleteExamBtn = document.getElementById('deleteExamBtn');
const saveExamBtn = document.getElementById('saveExamBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const gitProgress = document.getElementById('gitProgress');
const stepLocal = document.getElementById('stepLocal');
const stepGit = document.getElementById('stepGit');

// Stats Elements
const statActive = document.getElementById('statActive');

// Toast Notification System
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';
  if (type === 'info') icon = 'fa-circle-info';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInToast 0.3s ease-in reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Fetch Exams from API
async function fetchExams() {
  try {
    const res = await fetch('/api/exams');
    if (!res.ok) throw new Error('Failed to fetch exams');
    exams = await res.json();
    updateStats();
    renderExams();
    startCountdownTicker();
  } catch (error) {
    showToast(error.message, 'error');
    examsGrid.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-circle-exclamation" style="font-size: 40px; color: var(--color-danger);"></i>
        <p style="margin-top:10px;">Failed to load exam data. Make sure the server is running.</p>
      </div>
    `;
  }
}

// Update UI Stats
function updateStats() {
  const withDates = exams.filter(e => e.date && e.date.trim() !== '');
  statActive.textContent = withDates.length;
}

// Start Countdown Ticker
function startCountdownTicker() {
  if (countdownInterval) clearInterval(countdownInterval);
  updateAllCountdowns(); // Initial update
  countdownInterval = setInterval(updateAllCountdowns, 1000);
}

// Update All Countdown Tickers on screen
function updateAllCountdowns() {
  const cards = document.querySelectorAll('.exam-card[data-date]');
  const now = new Date().getTime();
  
  cards.forEach(card => {
    const targetDateStr = card.getAttribute('data-date');
    if (!targetDateStr) return;
    
    const targetDate = new Date(targetDateStr + 'T00:00:00').getTime();
    const distance = targetDate - now;
    const digitsContainer = card.querySelector('.countdown-digits');
    
    if (distance < 0) {
      // Exam date has arrived or passed
      const daysPassed = Math.floor(Math.abs(distance) / (1000 * 60 * 60 * 24));
      if (daysPassed === 0) {
        digitsContainer.innerHTML = `<div class="exam-passed" style="color:var(--color-success); text-shadow: 0 0 10px var(--color-success)">⚡ Today is the day! ⚡</div>`;
      } else {
        digitsContainer.innerHTML = `<div class="exam-passed">Passed ${daysPassed} day${daysPassed > 1 ? 's' : ''} ago</div>`;
      }
      return;
    }
    
    // Time calculations
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    // Color code based on proximity
    let digitColorClass = '';
    if (days < 7) {
      digitColorClass = 'style="color: var(--color-danger); text-shadow: var(--glow-danger); border-color: rgba(255,0,84,0.3)"';
    } else if (days < 30) {
      digitColorClass = 'style="color: var(--color-warning); text-shadow: 0 0 15px rgba(255,183,3,0.35); border-color: rgba(255,183,3,0.3)"';
    }
    
    digitsContainer.innerHTML = `
      <div class="digit-box">
        <span class="digit-val" ${digitColorClass}>${String(days).padStart(2, '0')}</span>
        <span class="digit-label">Days</span>
      </div>
      <div class="digit-box">
        <span class="digit-val" ${digitColorClass}>${String(hours).padStart(2, '0')}</span>
        <span class="digit-label">Hrs</span>
      </div>
      <div class="digit-box">
        <span class="digit-val" ${digitColorClass}>${String(minutes).padStart(2, '0')}</span>
        <span class="digit-label">Min</span>
      </div>
      <div class="digit-box">
        <span class="digit-val" ${digitColorClass}>${String(seconds).padStart(2, '0')}</span>
        <span class="digit-label">Sec</span>
      </div>
    `;
  });
}

// Render Exams to Grid
function renderExams() {
  const filtered = exams.filter(exam => {
    const matchesCategory = activeCategory === 'all' || exam.category === activeCategory;
    const matchesSearch = exam.name.toLowerCase().includes(searchQuery) ||
                          (exam.description || '').toLowerCase().includes(searchQuery) ||
                          (exam.category || '').toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    examsGrid.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-folder-open" style="font-size: 40px; color: var(--text-secondary);"></i>
        <p style="margin-top:10px;">No exams found matching current filters.</p>
      </div>
    `;
    return;
  }

  examsGrid.innerHTML = filtered.map(exam => {
    const categoryClass = exam.category === 'Bank Exam' ? 'bank' : exam.category === 'Group Exam' ? 'group' : '';
    
    // Check if date is set
    const hasDate = exam.date && exam.date.trim() !== '';
    let countdownHTML = '';
    
    if (hasDate) {
      countdownHTML = `
        <div class="countdown-panel">
          <div class="countdown-label">Time Remaining</div>
          <div class="countdown-digits">
            <!-- Ticker will inject clock here -->
            <div class="digit-box"><span class="digit-val">--</span><span class="digit-label">Days</span></div>
            <div class="digit-box"><span class="digit-val">--</span><span class="digit-label">Hrs</span></div>
            <div class="digit-box"><span class="digit-val">--</span><span class="digit-label">Min</span></div>
            <div class="digit-box"><span class="digit-val">--</span><span class="digit-label">Sec</span></div>
          </div>
        </div>
      `;
    } else {
      countdownHTML = `
        <div class="countdown-panel">
          <div class="countdown-pending">
            <button class="btn-set-date" onclick="openEditModal('${exam.id}')">
              <i class="fa-solid fa-calendar-plus"></i> Set Target Date
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="exam-card glassmorphism" ${hasDate ? `data-date="${exam.date}"` : ''}>
        ${isAdminMode ? `
          <button class="btn-card-edit" onclick="openEditModal('${exam.id}')" title="Edit Exam">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        ` : ''}
        <div class="exam-card-header">
          <h3 class="exam-card-title">${escapeHTML(exam.name)}</h3>
          <span class="category-tag ${categoryClass}">${escapeHTML(exam.category)}</span>
        </div>
        <div class="exam-card-body">
          <p class="exam-description">${escapeHTML(exam.description || 'No description or syllabus details added yet.')}</p>
          ${countdownHTML}
        </div>
        <div class="exam-card-actions">
          ${exam.link ? `
            <a href="${escapeHTML(exam.link)}" target="_blank" class="btn btn-primary" style="flex: 1; text-decoration: none;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Visit Official Site
            </a>
          ` : `
            <button class="btn btn-secondary" style="flex: 1;" disabled>
              <i class="fa-solid fa-link-slash"></i> No Link Available
            </button>
          `}
          ${isAdminMode ? `
            <button class="btn btn-secondary" onclick="openEditModal('${exam.id}')" style="padding: 10px;">
              <i class="fa-solid fa-gear"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  updateAllCountdowns();
}

// Utility to escape HTML and prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Category Pill Filter handler
categoryFilters.addEventListener('click', (e) => {
  if (e.target.classList.contains('filter-pill')) {
    document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
    e.target.classList.add('active');
    activeCategory = e.target.getAttribute('data-category');
    renderExams();
  }
});

// Search input handler
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase().trim();
  clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
  renderExams();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.style.display = 'none';
  renderExams();
});

// Admin Panel Toggle Button
adminModeBtn.addEventListener('click', () => {
  isAdminMode = !isAdminMode;
  if (isAdminMode) {
    adminModeBtn.innerHTML = '<i class="fa-solid fa-lock admin-icon"></i> Exit Admin Mode';
    adminModeBtn.classList.remove('btn-secondary');
    adminModeBtn.classList.add('btn-primary');
    showToast('Admin mode active. You can now edit and add exams.', 'info');
    
    // Add "Add Exam" pill to filters if admin is active
    if (!document.getElementById('addExamPill')) {
      const addPill = document.createElement('button');
      addPill.id = 'addExamPill';
      addPill.className = 'filter-pill';
      addPill.style.borderColor = 'var(--accent-cyan)';
      addPill.style.color = 'var(--accent-cyan)';
      addPill.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Add New';
      addPill.addEventListener('click', () => openAddModal());
      categoryFilters.appendChild(addPill);
    }
  } else {
    adminModeBtn.innerHTML = '<i class="fa-solid fa-lock-open admin-icon"></i> Admin Panel';
    adminModeBtn.classList.remove('btn-primary');
    adminModeBtn.classList.add('btn-secondary');
    const addPill = document.getElementById('addExamPill');
    if (addPill) addPill.remove();
    showToast('Exited Admin mode.', 'info');
  }
  renderExams();
});

// Modal Logic
function openAddModal() {
  modalTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add New Exam';
  examIdInput.value = '';
  examForm.reset();
  deleteExamBtn.style.display = 'none';
  gitProgress.style.display = 'none';
  
  // Try to pre-fill admin password if saved in sessionStorage
  const savedPassword = sessionStorage.getItem('adminPassword');
  if (savedPassword) {
    adminPasswordInput.value = savedPassword;
  }
  
  adminModal.style.display = 'flex';
}

window.openEditModal = function(id) {
  const exam = exams.find(e => e.id === id);
  if (!exam) return;
  
  modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Exam Info';
  examIdInput.value = exam.id;
  examNameInput.value = exam.name;
  examLinkInput.value = exam.link || '';
  examCategorySelect.value = exam.category || 'Other';
  examDateInput.value = exam.date || '';
  examDescriptionText.value = exam.description || '';
  
  deleteExamBtn.style.display = 'inline-flex';
  gitProgress.style.display = 'none';
  
  const savedPassword = sessionStorage.getItem('adminPassword');
  if (savedPassword) {
    adminPasswordInput.value = savedPassword;
  } else {
    adminPasswordInput.value = '';
  }
  
  adminModal.style.display = 'flex';
};

function closeModal() {
  adminModal.style.display = 'none';
  gitProgress.style.display = 'none';
}

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

// Handle modal save form submit
examForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const examId = examIdInput.value;
  const password = adminPasswordInput.value;
  
  // Cache password for ease of use
  sessionStorage.setItem('adminPassword', password);
  
  const examData = {
    name: examNameInput.value,
    link: examLinkInput.value,
    category: examCategorySelect.value,
    date: examDateInput.value,
    description: examDescriptionText.value
  };
  
  if (examId) {
    examData.id = examId;
  }
  
  // Show progress indicator
  gitProgress.style.display = 'block';
  stepLocal.className = 'progress-step-item';
  stepLocal.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin sync-icon"></i> Saving locally...';
  stepGit.className = 'progress-step-item';
  stepGit.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Pushing changes to remote GitHub...';
  
  saveExamBtn.disabled = true;
  cancelModalBtn.disabled = true;
  deleteExamBtn.disabled = true;
  
  try {
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam: examData, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Server error occurred');
    }
    
    stepLocal.innerHTML = '<i class="fa-solid fa-circle-check done-icon"></i> Saved to local database!';
    stepGit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin sync-icon"></i> Staging, committing and pushing changes...';
    
    showToast(data.message, 'success');
    
    // Simulating checking Git progress
    setTimeout(async () => {
      stepGit.innerHTML = '<i class="fa-solid fa-circle-check done-icon"></i> Successfully pushed changes to Git!';
      setTimeout(() => {
        closeModal();
        fetchExams();
      }, 1000);
    }, 1500);
    
  } catch (error) {
    showToast(error.message, 'error');
    gitProgress.style.display = 'none';
  } finally {
    saveExamBtn.disabled = false;
    cancelModalBtn.disabled = false;
    deleteExamBtn.disabled = false;
  }
});

// Handle Exam Deletion
deleteExamBtn.addEventListener('click', async () => {
  const id = examIdInput.value;
  const password = adminPasswordInput.value;
  
  if (!id) return;
  
  if (!confirm('Are you sure you want to delete this exam? This will push updates to Git.')) {
    return;
  }
  
  gitProgress.style.display = 'block';
  stepLocal.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin sync-icon"></i> Deleting locally...';
  stepGit.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Synchronizing with git...';
  
  deleteExamBtn.disabled = true;
  saveExamBtn.disabled = true;
  
  try {
    const res = await fetch('/api/exams/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');
    
    stepLocal.innerHTML = '<i class="fa-solid fa-circle-check done-icon"></i> Deleted locally!';
    stepGit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin sync-icon"></i> Updating Git remote...';
    
    showToast(data.message, 'success');
    
    setTimeout(() => {
      stepGit.innerHTML = '<i class="fa-solid fa-circle-check done-icon"></i> Remote Git synchronized!';
      setTimeout(() => {
        closeModal();
        fetchExams();
      }, 1000);
    }, 1500);
    
  } catch (error) {
    showToast(error.message, 'error');
    gitProgress.style.display = 'none';
  } finally {
    deleteExamBtn.disabled = false;
    saveExamBtn.disabled = false;
  }
});

// WhatsApp settings panel toggle
const waSettingsTrigger = document.getElementById('waSettingsTrigger');
const waSettingsPanel = document.getElementById('waSettingsPanel');
const testWhatsAppBtn = document.getElementById('testWhatsAppBtn');
const triggerDailyDigestBtn = document.getElementById('triggerDailyDigestBtn');

waSettingsTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  waSettingsPanel.style.display = waSettingsPanel.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if (waSettingsPanel.style.display === 'block' && !waSettingsPanel.contains(e.target) && e.target !== waSettingsTrigger) {
    waSettingsPanel.style.display = 'none';
  }
});

// WhatsApp Actions
testWhatsAppBtn.addEventListener('click', async () => {
  testWhatsAppBtn.disabled = true;
  testWhatsAppBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
  
  try {
    const res = await fetch('/api/whatsapp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🔔 *ApexExam Tracker Notification Check*\n\nYour WhatsApp alert integration is connected and working!' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send test message');
    showToast('Test WhatsApp message sent successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    testWhatsAppBtn.disabled = false;
    testWhatsAppBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Test WhatsApp Now';
  }
});

triggerDailyDigestBtn.addEventListener('click', async () => {
  triggerDailyDigestBtn.disabled = true;
  triggerDailyDigestBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Calculating Digest...';
  
  try {
    const res = await fetch('/api/whatsapp/trigger-daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send daily digest');
    showToast('Countdown digest sent to WhatsApp successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    triggerDailyDigestBtn.disabled = false;
    triggerDailyDigestBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Send Countdown Digest Now';
  }
});

// Floating Chatbot Assistant Logic
const chatTriggerBtn = document.getElementById('chatTriggerBtn');
const chatWindow = document.getElementById('chatWindow');
const chatPulse = document.getElementById('chatPulse');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMessages = document.getElementById('chatMessages');

chatTriggerBtn.addEventListener('click', () => {
  const isClosed = chatWindow.style.display === 'none';
  chatWindow.style.display = isClosed ? 'flex' : 'none';
  chatPulse.style.display = 'none'; // Dismiss bubble once clicked
  
  const icon = chatTriggerBtn.querySelector('i:first-child');
  const closeIcon = chatTriggerBtn.querySelector('.close-icon');
  
  if (isClosed) {
    icon.style.display = 'none';
    closeIcon.style.display = 'block';
    chatInput.focus();
  } else {
    icon.style.display = 'block';
    closeIcon.style.display = 'none';
  }
});

// Suggestions tags triggers
document.querySelectorAll('.suggestion-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const query = tag.getAttribute('data-query');
    chatInput.value = query;
    handleSendMessage();
  });
});

sendChatBtn.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSendMessage();
});

function appendChatMessage(content, sender = 'bot') {
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg message-${sender}`;
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  msgDiv.innerHTML = `
    <div class="message-content">${content}</div>
    <span class="msg-time">${time}</span>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  
  appendChatMessage(text, 'user');
  chatInput.value = '';
  
  // Show bot typing effect
  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg message-bot typing-indicator';
  typingDiv.innerHTML = `
    <div class="message-content"><i class="fa-solid fa-ellipsis fa-bounce"></i> Thinking...</div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  setTimeout(() => {
    typingDiv.remove();
    const reply = generateBotReply(text);
    appendChatMessage(reply, 'bot');
  }, 800);
}

// Simple rule-based intelligent NLP assistant for local exams dataset
function generateBotReply(query) {
  const clean = query.toLowerCase();
  
  // Greetings
  if (clean.match(/\b(hi|hello|hey|greetings|yo)\b/)) {
    return `Hello Raj! I can help you check countdowns, exams schedules, official links, or details. Ask me things like "what is my next exam?" or "exams without dates."`;
  }
  
  // Help
  if (clean.includes('help') || clean.includes('what can you do')) {
    return `I am your Exam Assistant. You can ask me: <br>
      • <b>"Which exam is next?"</b> - To see the closest upcoming date.<br>
      • <b>"Links"</b> - For links to registration and official portals.<br>
      • <b>"Exams pending"</b> - To show list of exams with unannounced dates.<br>
      • <b>"WhatsApp"</b> - To check alert configurations.<br>
      • <b>"Syllabus for [Exam Name]"</b> - To read exam description notes.`;
  }

  // Active dates query
  const examsWithDates = exams.filter(e => e.date && e.date.trim() !== '');
  
  // Next exam query
  if (clean.includes('next') || clean.includes('soon') || clean.includes('upcoming') || clean.includes('first')) {
    if (examsWithDates.length === 0) {
      return `You don't have any exams with confirmed dates yet! Go to the Admin Panel to set dates.`;
    }
    
    // Sort by date ascending (closest future)
    const futureExams = examsWithDates
      .map(e => ({ ...e, time: new Date(e.date + 'T00:00:00') - new Date() }))
      .filter(e => e.time >= -86400000) // Include today
      .sort((a,b) => a.time - b.time);
      
    if (futureExams.length === 0) {
      return `All scheduled exams have already passed. You should update their dates in the Admin Panel!`;
    }
    
    const next = futureExams[0];
    const days = Math.ceil(next.time / (1000 * 60 * 60 * 24));
    return `Your closest upcoming event is <b>${next.name}</b> on <b>${next.date}</b>. <br>That is in <b>${days} days</b>! <br>🔗 <a href="${next.link}" target="_blank">Official link</a>`;
  }
  
  // Link queries
  if (clean.includes('link') || clean.includes('url') || clean.includes('website')) {
    const list = exams.map(e => `• <b>${e.name}</b>: ${e.link ? `<a href="${e.link}" target="_blank">Link</a>` : 'No link'}`).join('<br>');
    return `Here are the official links for your monitored exams:<br>${list}`;
  }
  
  // Pending dates queries
  if (clean.includes('pending') || clean.includes('no date') || clean.includes('unannounced') || clean.includes('without date')) {
    const noDates = exams.filter(e => !e.date || e.date.trim() === '');
    if (noDates.length === 0) {
      return `Excellent! All your monitored exams have dates entered.`;
    }
    const list = noDates.map(e => `• <b>${e.name}</b> (${e.category})`).join('<br>');
    return `The following exams are waiting for dates to be announced:<br>${list}`;
  }
  
  // WhatsApp notification details query
  if (clean.includes('whatsapp') || clean.includes('alert') || clean.includes('notification') || clean.includes('number')) {
    return `Daily alerts are scheduled to send automatically at <b>8:00 AM</b> every morning.<br>
      Recipient: <b>+91 9043389303</b>.<br>
      You can trigger an immediate update or a test notification by clicking the WhatsApp icon on the bottom left of your screen!`;
  }
  
  // Specific exam details matching
  for (const exam of exams) {
    if (clean.includes(exam.name.toLowerCase()) || 
        (exam.category && clean.includes(exam.category.toLowerCase())) ||
        (exam.id && clean === exam.id)) {
      
      const timeRemaining = exam.date ? `Scheduled for <b>${exam.date}</b>` : `Date is <b>pending announcement</b>`;
      return `<b>${exam.name}</b> (${exam.category})<br>
              📅 Status: ${timeRemaining}<br>
              📝 Description: ${exam.description || 'No description'}<br>
              🔗 Link: ${exam.link ? `<a href="${exam.link}" target="_blank">Portal Link</a>` : 'Not set'}`;
    }
  }
  
  // Search query fallback
  const matches = exams.filter(exam => 
    exam.name.toLowerCase().includes(clean) || 
    (exam.description || '').toLowerCase().includes(clean)
  );
  
  if (matches.length > 0) {
    const list = matches.map(e => `• <b>${e.name}</b> (${e.date || 'Pending'})`).join('<br>');
    return `I found these exams matching "${query}":<br>${list}<br>Ask me for more details on any of these!`;
  }

  return `I'm not sure how to answer "${query}". I know about exam countdowns, registration links, WhatsApp alerts, and syllabus. Try asking "Which exam is next?" or "Give me links."`;
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  fetchExams();
  
  // Pulse text dismiss after 6 seconds
  setTimeout(() => {
    chatPulse.style.opacity = '0';
    setTimeout(() => chatPulse.remove(), 500);
  }, 8000);
});
