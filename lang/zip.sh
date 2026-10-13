#!/bin/sh

# Zip current directory into stack.zip while excluding heavy or local build items
zip -r stack.zip . -x \
  "node_modules/*" \
  "dist/*" \
  ".vercel/*" \
  "*.log" \
  "*.DS_Store" \
  "stack.zip"

echo "Folder compressed into stack.zip successfully!"
