#!/bin/bash

# FitArchitect Development Environment Cleanup Script
# This script properly terminates all development processes

echo "🧹 Cleaning up FitArchitect development processes..."

# Function to kill processes gracefully
kill_processes() {
    local process_name=$1
    local pids=$(pgrep -f "$process_name" 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "Found processes matching '$process_name': $pids"
        
        # First try graceful termination (SIGTERM)
        echo "Attempting graceful shutdown..."
        echo "$pids" | xargs -r kill -TERM 2>/dev/null
        
        # Wait a bit for graceful shutdown
        sleep 3
        
        # Check if any processes are still running
        local remaining=$(pgrep -f "$process_name" 2>/dev/null)
        if [ -n "$remaining" ]; then
            echo "Force killing remaining processes: $remaining"
            echo "$remaining" | xargs -r kill -KILL 2>/dev/null
        fi
        
        echo "✅ Cleaned up processes matching '$process_name'"
    else
        echo "ℹ️  No processes found matching '$process_name'"
    fi
}

# Kill Node.js development processes
echo "🔍 Looking for Node.js development processes..."
kill_processes "ts-node.*server"
kill_processes "node.*ts-node-dev"
kill_processes "vite"
kill_processes "concurrently"

# Kill any processes specifically using port 3001
echo "🔍 Looking for processes using port 3001..."
PORT_PIDS=$(lsof -ti:3001 2>/dev/null)
if [ -n "$PORT_PIDS" ]; then
    echo "Found processes using port 3001: $PORT_PIDS"
    echo "$PORT_PIDS" | xargs -r kill -TERM 2>/dev/null
    sleep 2
    # Force kill if still running
    REMAINING_PORT=$(lsof -ti:3001 2>/dev/null)
    if [ -n "$REMAINING_PORT" ]; then
        echo "Force killing remaining processes on port 3001: $REMAINING_PORT"
        echo "$REMAINING_PORT" | xargs -r kill -KILL 2>/dev/null
    fi
    echo "✅ Cleaned up port 3001"
else
    echo "ℹ️  No processes found using port 3001"
fi

# Clean up any leftover node modules processes
echo "🔍 Looking for other Node.js processes in the project directory..."
PROJECT_PROCESSES=$(pgrep -f "fitarchitect" 2>/dev/null)
if [ -n "$PROJECT_PROCESSES" ]; then
    echo "Found project-related processes: $PROJECT_PROCESSES"
    echo "$PROJECT_PROCESSES" | xargs -r kill -TERM 2>/dev/null
    sleep 2
    REMAINING_PROJECT=$(pgrep -f "fitarchitect" 2>/dev/null)
    if [ -n "$REMAINING_PROJECT" ]; then
        echo "Force killing remaining project processes: $REMAINING_PROJECT"
        echo "$REMAINING_PROJECT" | xargs -r kill -KILL 2>/dev/null
    fi
    echo "✅ Cleaned up project processes"
else
    echo "ℹ️  No project-related processes found"
fi

echo ""
echo "🎉 Development environment cleanup complete!"
echo ""
echo "You can now safely start the development environment with:"
echo "  npm run dev:all"
echo ""