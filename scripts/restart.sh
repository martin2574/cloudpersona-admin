#!/bin/bash
# Admin 빌드 + 재시작
set -e

cd /home/ubuntu/cloudpersona/cloudpersona-admin

echo "=== 1. vite build ==="
npx vite build

echo "=== 2. restart admin ==="
sudo systemctl restart admin

echo "=== 3. status ==="
sudo systemctl status admin --no-pager -l

echo "=== done ==="
