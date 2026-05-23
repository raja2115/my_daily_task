const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const workspaceDir = path.join(__dirname, '..');

/**
 * Automatically commits exams.json and pushes to the git repository
 */
async function syncExamsWithGit() {
  const remoteUrl = process.env.GIT_REMOTE_URL;
  if (!remoteUrl || remoteUrl.startsWith('https://github.com/username')) {
    console.warn('[Git Sync Warning] GIT_REMOTE_URL not configured. Skipping push.');
    return { success: false, reason: 'Remote URL not configured in .env' };
  }

  console.log('[Git Sync] Starting Git synchronization...');
  const git = simpleGit(workspaceDir);

  try {
    // 1. Check if git is initialized
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log('[Git Sync] Directory is not a git repository. Initializing...');
      await git.init();
    }

    // 2. Manage Remote Origin
    const remotes = await git.getRemotes(true);
    const originExists = remotes.some(r => r.name === 'origin');
    
    if (!originExists) {
      console.log(`[Git Sync] Adding remote origin: ${remoteUrl}`);
      await git.addRemote('origin', remoteUrl);
    } else {
      const currentOrigin = remotes.find(r => r.name === 'origin').refs.push;
      if (currentOrigin !== remoteUrl) {
        console.log(`[Git Sync] Updating remote origin URL to: ${remoteUrl}`);
        await git.remote(['set-url', 'origin', remoteUrl]);
      }
    }

    // 3. Stage changes
    console.log('[Git Sync] Staging exams.json...');
    await git.add('exams.json');

    // Check if there are actual changes to commit
    const status = await git.status();
    if (status.staged.length === 0) {
      console.log('[Git Sync] No changes detected in exams.json. Nothing to commit.');
      return { success: true, reason: 'No changes detected' };
    }

    // 4. Commit changes
    const timestamp = new Date().toLocaleString();
    const commitMsg = `update: exams list updated via admin panel at ${timestamp}`;
    console.log(`[Git Sync] Committing changes: "${commitMsg}"`);
    await git.commit(commitMsg);

    // 5. Determine Branch Name (default to main, or find current active branch)
    let branchName = 'main';
    try {
      const branchSummary = await git.branchLocal();
      branchName = branchSummary.current || 'main';
    } catch (e) {
      // Fallback
    }

    // 6. Push changes
    console.log(`[Git Sync] Pushing changes to origin/${branchName}...`);
    // Note: If this fails, it might require user credentials (PAT or SSH keys) configured
    await git.push('origin', branchName);
    console.log('[Git Sync] Git push completed successfully!');
    
    return { success: true, commit: commitMsg, branch: branchName };
  } catch (error) {
    console.error('[Git Sync Error] Git operations failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  syncExamsWithGit
};
