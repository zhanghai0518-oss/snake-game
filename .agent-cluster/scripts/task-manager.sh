#!/bin/bash
# Agent Task Manager - 管理所有Agent任务
TASKS_DIR="$(dirname "$0")/../tasks"
LOGS_DIR="$(dirname "$0")/../logs"
mkdir -p "$TASKS_DIR" "$LOGS_DIR"

create_task() {
    local id=$1 desc=$2 agent=$3 branch=$4
    cat > "$TASKS_DIR/${id}.json" << EOF
{
  "id": "$id",
  "description": "$desc",
  "agent": "$agent",
  "branch": "$branch",
  "worktree": "../snake-worktrees/$id",
  "startedAt": $(date +%s)000,
  "status": "running",
  "retries": 0,
  "maxRetries": 3,
  "notifyOnComplete": true
}
EOF
    echo "Task created: $id"
}

list_tasks() {
    echo "=== Active Agent Tasks ==="
    for f in "$TASKS_DIR"/*.json; do
        [ -f "$f" ] || continue
        python3 -c "
import json
with open('$f') as f:
    t = json.load(f)
    print(f\"  [{t['status']}] {t['id']} - {t['description']} (agent: {t['agent']})\")
"
    done
}

update_status() {
    local id=$1 status=$2
    python3 -c "
import json
with open('$TASKS_DIR/${id}.json', 'r+') as f:
    t = json.load(f)
    t['status'] = '$status'
    f.seek(0); json.dump(t, f, indent=2); f.truncate()
"
}

"$@"
