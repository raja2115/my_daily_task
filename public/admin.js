document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Instead of Admin ID, we now only need a GitHub Token from the password field
    const githubToken = document.getElementById('password').value;
    const name = document.getElementById('examName').value;
    const link = document.getElementById('examLink').value;
    const date = document.getElementById('examDate').value;
    const statusMsg = document.getElementById('status-msg');
    const submitBtn = document.getElementById('submit-btn');

    statusMsg.textContent = 'Adding exam to GitHub...';
    statusMsg.className = '';
    submitBtn.disabled = true;

    const REPO_OWNER = 'raja2115';
    const REPO_NAME = 'my_daily_task';
    const FILE_PATH = 'public/exams.json';

    try {
        // Step 1: Get the current file's SHA and content
        const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=main`;
        const getResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            throw new Error('Failed to access repository. Is your GitHub Token correct?');
        }

        const fileData = await getResponse.json();
        const sha = fileData.sha;
        
        // Decode existing content
        const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
        let exams = JSON.parse(decodedContent);

        // Step 2: Append new exam
        const newExam = {
            id: Date.now().toString(),
            name,
            link,
            date
        };
        exams.push(newExam);

        // Step 3: Encode updated content
        const updatedContentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(exams, null, 2))));

        // Step 4: Commit changes back to GitHub
        const putResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Add exam: ${name}`,
                content: updatedContentBase64,
                sha: sha,
                branch: 'main'
            })
        });

        if (putResponse.ok) {
            statusMsg.textContent = 'Success! Exam added. Website will update in ~30 seconds.';
            statusMsg.className = 'success';
            document.getElementById('examName').value = '';
            document.getElementById('examLink').value = '';
            document.getElementById('examDate').value = '';
        } else {
            const errData = await putResponse.json();
            throw new Error(errData.message || 'Failed to save changes');
        }
    } catch (err) {
        statusMsg.textContent = 'Error: ' + err.message;
        statusMsg.className = 'error';
    } finally {
        submitBtn.disabled = false;
    }
});
