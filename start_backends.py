#!/usr/bin/env python3
"""
Unified Backend Startup Script for TigerTrust
Starts all backend services: AI Scoring, Human Verification, and RSE Server
"""

import subprocess
import time
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from root .env file
project_root = Path(__file__).parent
env_file = project_root / ".env"
if env_file.exists():
    load_dotenv(env_file)
    print(f"✓ Loaded environment variables from {env_file}")
else:
    print(f"⚠ Warning: .env file not found at {env_file}")
    print(f"  Copy .env.example to .env and configure your API keys")

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}➤ {text}{Colors.ENDC}")

def start_service(name, command, cwd, shell=True):
    """Start a backend service as a subprocess"""
    try:
        print_info(f"Starting {name}...")
        # Inherit environment variables from parent process (which loaded .env)
        process = subprocess.Popen(
            command,
            cwd=cwd,
            shell=shell,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=os.environ.copy()  # Pass environment variables to child process
        )
        time.sleep(2)  # Give it time to start
        
        # Check if process is still running
        if process.poll() is None:
            print_success(f"{name} started successfully (PID: {process.pid})")
            return process
        else:
            print_error(f"{name} failed to start")
            return None
    except Exception as e:
        print_error(f"Error starting {name}: {str(e)}")
        return None

def main():
    print_header("TigerTrust Backend Startup")
    
    # Validate critical environment variables
    required_vars = ['GEMINI_API_KEY', 'SOLANA_RPC_URL']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print_error(f"Missing required environment variables: {', '.join(missing_vars)}")
        print_info("Please copy .env.example to .env and configure the required values")
        sys.exit(1)
    
    print_success("Environment variables validated")
    
    # Store all processes
    processes = []
    
    # 1. Start AI Scoring Backend (Flask - Port 5001)
    print_header("AI Scoring Backend (Port 5001)")
    ai_scoring_dir = project_root / "ai_scoring"
    if ai_scoring_dir.exists():
        python_cmd = "python api.py" if sys.platform == "win32" else "python3 api.py"
        ai_process = start_service(
            "AI Scoring API",
            python_cmd,
            str(ai_scoring_dir)
        )
        if ai_process:
            processes.append(("AI Scoring API", ai_process))
    else:
        print_error("ai_scoring directory not found")
    
    # 2. Start Human Verification Backend (Flask - Port 5000)
    print_header("Human Verification Backend (Port 5000)")
    human_verification_dir = project_root / "human_verification"
    if human_verification_dir.exists():
        python_cmd = "python app.py" if sys.platform == "win32" else "python3 app.py"
        human_process = start_service(
            "Human Verification API",
            python_cmd,
            str(human_verification_dir)
        )
        if human_process:
            processes.append(("Human Verification API", human_process))
    else:
        print_error("human_verification directory not found")
    
    # 3. Start RSE Server (Node.js)
    print_header("RSE Server (Real-time Scoring Engine)")
    rse_server_dir = project_root / "rse-server"
    if rse_server_dir.exists():
        npm_cmd = "npm.cmd run dev" if sys.platform == "win32" else "npm run dev"
        rse_process = start_service(
            "RSE Server",
            npm_cmd,
            str(rse_server_dir)
        )
        if rse_process:
            processes.append(("RSE Server", rse_process))
    else:
        print_error("rse-server directory not found")
    
    # Summary
    print_header("All Services Started")
    print_success(f"Total services running: {len(processes)}")
    print("\n📊 Service Status:")
    print(f"{Colors.OKGREEN}{'─'*60}{Colors.ENDC}")
    for name, process in processes:
        print(f"  • {name:<30} PID: {process.pid}")
    print(f"{Colors.OKGREEN}{'─'*60}{Colors.ENDC}\n")
    
    print(f"{Colors.WARNING}Press Ctrl+C to stop all services{Colors.ENDC}\n")
    
    # Keep the script running and monitor processes
    try:
        while True:
            time.sleep(1)
            # Check if any process has died
            for name, process in processes:
                if process.poll() is not None:
                    print_error(f"{name} has stopped unexpectedly (exit code: {process.poll()})")
                    # Optionally restart it here
    except KeyboardInterrupt:
        print_header("Shutting Down All Services")
        for name, process in processes:
            print_info(f"Stopping {name}...")
            process.terminate()
            try:
                process.wait(timeout=5)
                print_success(f"{name} stopped")
            except subprocess.TimeoutExpired:
                print_error(f"{name} did not stop gracefully, killing...")
                process.kill()
        print_success("All services stopped")
        sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print_error(f"Fatal error: {str(e)}")
        sys.exit(1)
