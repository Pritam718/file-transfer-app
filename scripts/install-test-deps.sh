#!/bin/bash
# install-test-deps.sh - Install testing dependencies

echo "📦 Installing Jest and testing dependencies..."

npm install --save-dev \
  jest@^29.7.0 \
  @types/jest@^29.5.12 \
  ts-jest@^29.1.2 \
  ts-node@^10.9.2

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Testing dependencies installed successfully!"
  echo ""
  echo "🧪 Available commands:"
  echo "  npm test              - Run all tests"
  echo "  npm run test:watch    - Watch mode"
  echo "  npm run test:coverage - Generate coverage"
  echo ""
  echo "🚀 Try running: npm test"
else
  echo "❌ Installation failed!"
  exit 1
fi
