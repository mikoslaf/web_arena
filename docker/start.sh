#!/bin/sh
set -eu

node /app/server/server.js &
NODE_PID=$!

cleanup() {
  kill "$NODE_PID" 2>/dev/null || true
}

trap cleanup INT TERM

nginx -g 'daemon off;'