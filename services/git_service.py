import os
import subprocess
import datetime
from dotenv import load_dotenv

load_dotenv()

def sync_exams_with_git():
    remote_url = os.getenv('GIT_REMOTE_URL')
    workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    if not remote_url or remote_url.startswith('https://github.com/username'):
        print("[Git Sync Warning] GIT_REMOTE_URL not configured. Skipping push.")
        return {"success": False, "reason": "Remote URL not configured in .env"}

    print("[Git Sync] Starting Git synchronization in Python...")
    
    try:
        # Helper to execute command in workspace
        def run_cmd(args):
            return subprocess.run(args, cwd=workspace_dir, capture_output=True, text=True, check=True)

        # 1. Check if git is initialized
        if not os.path.exists(os.path.join(workspace_dir, '.git')):
            print("[Git Sync] Directory is not a git repository. Initializing...")
            run_cmd(['git', 'init'])

        # 2. Configure identity locally if not present to avoid "Author identity unknown" error
        try:
            run_cmd(['git', 'config', 'user.name', 'Raja'])
            run_cmd(['git', 'config', 'user.email', 'rajalegand2115@outlook.com'])
        except Exception as e:
            print("[Git Sync Info] Could not configure local git settings:", str(e))

        # 3. Manage Remote Origin
        try:
            remotes = run_cmd(['git', 'remote', '-v']).stdout
            if 'origin' not in remotes:
                print(f"[Git Sync] Adding remote origin: {remote_url}")
                run_cmd(['git', 'remote', 'add', 'origin', remote_url])
            else:
                # Update remote url in case it changed
                run_cmd(['git', 'remote', 'set-url', 'origin', remote_url])
        except Exception as e:
            print("[Git Sync Warning] Checking/Setting remote failed:", str(e))

        # 4. Stage changes
        print("[Git Sync] Staging exams.json...")
        run_cmd(['git', 'add', 'exams.json'])

        # Check status
        status = run_cmd(['git', 'status', '--porcelain']).stdout
        if 'exams.json' not in status:
            print("[Git Sync] No changes detected in exams.json. Nothing to commit.")
            return {"success": True, "reason": "No changes detected"}

        # 5. Commit
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        commit_msg = f"update: exams list updated via admin panel at {timestamp}"
        print(f"[Git Sync] Committing changes: {commit_msg}")
        run_cmd(['git', 'commit', '-m', commit_msg])

        # 6. Push to default branch (main or master)
        branch_name = 'main'
        try:
            branch_summary = run_cmd(['git', 'branch', '--show-current']).stdout.strip()
            if branch_summary:
                branch_name = branch_summary
        except Exception:
            pass

        print(f"[Git Sync] Pushing changes to origin/{branch_name}...")
        # Note: In production / Render environment, this requires appropriate PAT or SSH config.
        # We run it with a timeout to avoid blocking indefinitely.
        subprocess.run(['git', 'push', 'origin', branch_name], cwd=workspace_dir, timeout=30, check=True)
        print("[Git Sync] Git push completed successfully!")
        
        return {"success": True, "commit": commit_msg, "branch": branch_name}
    except Exception as error:
        print("[Git Sync Error] Git operations failed:", str(error))
        # If it's a subprocess error, print stdout/stderr
        if hasattr(error, 'stderr') and error.stderr:
            print("[Git Sync Error Details]:", error.stderr)
        return {"success": False, "error": str(error)}
