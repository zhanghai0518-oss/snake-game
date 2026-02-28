#!/bin/bash
# Worktree Manager - 创建/清理git worktree
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
WORKTREE_BASE="$(dirname "$REPO_ROOT")/snake-worktrees"

create() {
    local branch=$1 task_id=$2
    mkdir -p "$WORKTREE_BASE"
    git worktree add "$WORKTREE_BASE/$task_id" -b "$branch" origin/main 2>/dev/null || \
    git worktree add "$WORKTREE_BASE/$task_id" -b "$branch" main
    echo "Worktree created: $WORKTREE_BASE/$task_id"
}

cleanup() {
    echo "Cleaning up completed worktrees..."
    git worktree list | grep -v "$(git rev-parse --show-toplevel)" | while read wt _; do
        task_id=$(basename "$wt")
        task_file=".agent-cluster/tasks/${task_id}.json"
        if [ -f "$task_file" ]; then
            status=$(python3 -c "import json; print(json.load(open('$task_file'))['status'])")
            if [ "$status" = "merged" ]; then
                git worktree remove "$wt" --force
                echo "  Removed: $wt"
            fi
        fi
    done
}

"$@"
