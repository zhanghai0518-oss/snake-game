#!/bin/bash
# Agent Monitor - 每10分钟检查一次Agent状态
TASKS_DIR="$(dirname "$0")/../tasks"
LOGS_DIR="$(dirname "$0")/../logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running agent monitor..."

for task_file in "$TASKS_DIR"/*.json; do
    [ -f "$task_file" ] || continue
    
    id=$(python3 -c "import json; print(json.load(open('$task_file'))['id'])")
    status=$(python3 -c "import json; print(json.load(open('$task_file'))['status'])")
    branch=$(python3 -c "import json; print(json.load(open('$task_file'))['branch'])")
    
    [ "$status" != "running" ] && continue
    
    echo "  Checking: $id (branch: $branch)"
    
    # Check if tmux session is alive
    if tmux has-session -t "$id" 2>/dev/null; then
        echo "    tmux: alive"
    else
        echo "    tmux: dead - checking if PR exists"
        # Check if PR was created
        if gh pr list --head "$branch" --json number 2>/dev/null | grep -q "number"; then
            echo "    PR exists - marking completed"
            python3 -c "
import json
with open('$task_file', 'r+') as f:
    t = json.load(f)
    t['status'] = 'pr_created'
    f.seek(0); json.dump(t, f, indent=2); f.truncate()
"
        fi
    fi
done >> "$LOGS_DIR/monitor-$(date +%Y%m%d).log" 2>&1
