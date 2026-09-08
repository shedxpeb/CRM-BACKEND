#!/usr/bin/env bash
# Install Playwright Chromium system dependencies for Linux
# Run this on the production server before deploying the backend

set -euo pipefail

echo "Checking for npx..."
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not installed or not in PATH"
  exit 1
fi

echo "Installing Playwright Chromium system dependencies..."
npx playwright install-deps chromium

echo "Playwright dependencies installed successfully."
echo "If this fails, manually install:"
echo "  sudo apt-get update"
echo "  sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2"
