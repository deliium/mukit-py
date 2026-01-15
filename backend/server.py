#!/usr/bin/env python3
"""
Production server runner for Mukit
Supports running on port or Unix socket based on environment variables

Environment variables:
    - INSTANCE_HOST: Host to bind to (default: 0.0.0.0)
    - PORT: Port to listen on (default: 8888)
    - SOCKET: Unix socket path (if set, socket mode is used instead of port)
"""

import os
import sys
import uvicorn
from uvicorn.config import Config
from uvicorn.server import Server


def run_on_port():
    """Run uvicorn server on TCP port"""
    host = os.environ.get('INSTANCE_HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 8888))
    
    print(f"🚀 Starting Mukit API server on http://{host}:{port}/")
    print(f"📚 API docs available at http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
    )


def run_on_socket():
    """Run uvicorn server on Unix socket"""
    socket_path = os.environ.get('SOCKET')
    
    if not socket_path:
        print("❌ Error: SOCKET environment variable is not set")
        sys.exit(1)
    
    # Remove existing socket file if it exists
    if os.path.exists(socket_path):
        os.unlink(socket_path)
    
    print(f"🚀 Starting Mukit API server on Unix socket: {socket_path}")
    print(f"📚 API docs available at http://unix:{socket_path}:/docs")
    
    # Create parent directory if it doesn't exist
    socket_dir = os.path.dirname(socket_path)
    if socket_dir and not os.path.exists(socket_dir):
        os.makedirs(socket_dir, mode=0o755)
    
    # Use Config and Server for Unix socket support
    # uvicorn.run() doesn't support uds parameter, so we use Config/Server

    config = Config(
        app="main:app",
        uds=socket_path,
        log_level="info",
        access_log=True,
    )
    server = Server(config)
    server.run()
    
    # Note: Socket permissions should be set by systemd or umask
    # If needed, you can set them manually after server starts


if __name__ == "__main__":
    # Check if running on socket or port
    if 'SOCKET' in os.environ:
        run_on_socket()
    else:
        run_on_port()

