document.addEventListener('DOMContentLoaded', () => {
    const examContainer = document.getElementById('exam-container');
    let examsData = [];

    // Fetch exams from static file
    fetch('exams.json')
        .then(response => response.json())
        .then(exams => {
            examsData = exams;
            renderExams(exams);
        })
        .catch(err => {
            console.error('Failed to fetch exams', err);
            examContainer.innerHTML = '<p style="color:var(--danger-color);text-align:center;">Failed to load exams.</p>';
        });

    function renderExams(exams) {
        examContainer.innerHTML = '';
        if (exams.length === 0) {
            examContainer.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-secondary);">No exams found. Add one in the Admin Panel.</p>';
            return;
        }

        const today = new Date();
        // Sort exams by closest date
        exams.sort((a, b) => new Date(a.date) - new Date(b.date));

        exams.forEach(exam => {
            const examDate = new Date(exam.date);
            const diffTime = examDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let daysText = "Days Left";
            let daysNum = diffDays;

            if (diffDays < 0) {
                daysText = "Passed";
                daysNum = "0";
            } else if (diffDays === 0) {
                daysText = "Today!";
                daysNum = "0";
            }

            const card = document.createElement('div');
            card.className = 'glass-panel exam-card';
            card.innerHTML = `
                <div>
                    <h2 class="exam-title">${exam.name}</h2>
                    <p class="exam-date-info">Date: ${examDate.toLocaleDateString()}</p>
                    <div class="countdown-box">
                        <div class="days-number">${daysNum}</div>
                        <div class="days-text">${daysText}</div>
                    </div>
                </div>
                <a href="${exam.link}" target="_blank" class="exam-link">Visit Website</a>
            `;
            examContainer.appendChild(card);
        });
    }

    // Chatbot Logic
    const chatbotHeader = document.getElementById('chatbot-header');
    const chatbotBody = document.getElementById('chatbot-body');
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');

    // Start with chatbot closed
    chatbotBody.classList.add('hidden');
    chatbotToggle.textContent = '+';

    chatbotHeader.addEventListener('click', () => {
        const isHidden = chatbotBody.classList.contains('hidden');
        if (isHidden) {
            chatbotBody.classList.remove('hidden');
            chatbotToggle.textContent = '−';
            chatInput.focus();
        } else {
            chatbotBody.classList.add('hidden');
            chatbotToggle.textContent = '+';
        }
    });

    function addMessage(text, isUser = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleChat() {
        const text = chatInput.value.trim().toLowerCase();
        if (!text) return;

        addMessage(chatInput.value, true);
        chatInput.value = '';

        // Simple bot logic
        setTimeout(() => {
            if (text.includes('hi') || text.includes('hello')) {
                addMessage('Hello! How can I help you with your exams today?');
            } else if (text.includes('how many') || text.includes('when')) {
                if (examsData.length === 0) {
                    addMessage("You don't have any exams tracked right now.");
                    return;
                }
                // Check if a specific exam is mentioned
                let found = false;
                for (let exam of examsData) {
                    if (text.includes(exam.name.toLowerCase())) {
                        const days = Math.ceil((new Date(exam.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        addMessage(`The ${exam.name} is on ${exam.date}. You have ${days} days left!`);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    const closest = examsData[0];
                    const days = Math.ceil((new Date(closest.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    addMessage(`Your next exam is ${closest.name} in ${days} days!`);
                }
            } else {
                addMessage("I can tell you about your upcoming exams. Ask 'When is my next exam?'");
            }
        }, 500);
    }

    sendBtn.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });
});
