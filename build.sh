#!/bin/bash

# Clean dist directory
rm -rf dist
rm -f extension.zip

# Build the project
npm run build

# Copy required files
cp manifest.json dist/
cp content.css dist/
cp -r icons dist/

# Verify files
echo "Verifying required files..."
required_files=("manifest.json" "popup.html" "popup.js" "popup.css" "content.js" "content.css" "background.js" "measurement-overlay.html")
for file in "${required_files[@]}"; do
    if [ -f "dist/$file" ]; then
        echo "✓ $file present"
    else
        echo "✗ Missing $file"
        exit 1
    fi
done

# Verify icons
if [ -d "dist/icons" ] && [ -f "dist/icons/icon16.png" ] && [ -f "dist/icons/icon32.png" ] && [ -f "dist/icons/icon48.png" ] && [ -f "dist/icons/icon128.png" ]; then
    echo "✓ Icons present"
else
    echo "✗ Missing icons"
    exit 1
fi

# Create extension package
cd dist
zip -r ../extension.zip .
cd ..

echo "Extension package created successfully!"
echo "Ready for Chrome Web Store submission"