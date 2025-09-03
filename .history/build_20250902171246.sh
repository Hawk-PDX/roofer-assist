#!/bin/bash

# Clean dist directory
rm -rf dist
rm -f extension.zip

# Build the project
npm run build

# Copy manifest and icons
cp manifest.json dist/
cp -r icons dist/

# Create extension package
cd dist
zip -r ../extension.zip .
cd ..

echo "Extension package created successfully!"