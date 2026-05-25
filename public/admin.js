document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId   = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value.trim();
    const name     = document.getElementById('examName').value.trim();
    const link     = document.getElementById('examLink').value.trim();
    const date     = document.getElementById('examDate').value;
    const statusMsg  = document.getElementById('status-msg');
    const submitBtn  = document.getElementById('submit-btn');

    statusMsg.textContent = '⏳ Adding exam and syncing to GitHub...';
    statusMsg.className = '';
    submitBtn.disabled = true;

    try {
        const res = await fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password, name, link, date })
        });

        const data = await res.json();

        if (res.ok) {
            statusMsg.textContent = '✅ Exam added successfully and pushed to GitHub!';
            statusMsg.className = 'success';
            document.getElementById('examName').value = '';
            document.getElementById('examLink').value = '';
            document.getElementById('examDate').value = '';
        } else {
            statusMsg.textContent = '❌ Error: ' + data.error;
            statusMsg.className = 'error';
        }
    } catch (err) {
        statusMsg.textContent = '❌ Network error. Make sure the server is running.';
        statusMsg.className = 'error';
    } finally {
        submitBtn.disabled = false;
    }
});
