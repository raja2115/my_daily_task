document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('examName').value;
    const link = document.getElementById('examLink').value;
    const date = document.getElementById('examDate').value;
    const statusMsg = document.getElementById('status-msg');
    const submitBtn = document.getElementById('submit-btn');

    statusMsg.textContent = 'Adding exam and syncing...';
    statusMsg.className = '';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/exams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, password, name, link, date })
        });

        const data = await response.json();

        if (response.ok) {
            statusMsg.textContent = 'Success! Exam added and pushed to Git.';
            statusMsg.className = 'success';
            document.getElementById('examName').value = '';
            document.getElementById('examLink').value = '';
            document.getElementById('examDate').value = '';
        } else {
            statusMsg.textContent = 'Error: ' + data.error;
            statusMsg.className = 'error';
        }
    } catch (err) {
        statusMsg.textContent = 'Network error. Server might be down.';
        statusMsg.className = 'error';
    } finally {
        submitBtn.disabled = false;
    }
});
