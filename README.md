# 🏠 Roof Measurement Tool Chrome Extension

A powerful Chrome extension for accurate roof measurements using satellite imagery from Google Maps and Bing Maps. Calculate ground area, roof area with pitch adjustment, shingle squares needed, and get cost estimates.

## 🚀 Features

- Measure roof dimensions directly from satellite imagery
- Calculate ground area and pitch-adjusted roof area
- Estimate shingle squares needed
- Generate material cost estimates
- Support for multiple roof types and pitches
- Save and export measurements
- Works with Google Maps and Bing Maps

## 🛠️ Installation

### For Users
1. Download the latest release from the Chrome Web Store (coming soon)
2. Click "Add to Chrome" to install the extension
3. The extension icon (📐) will appear in your Chrome toolbar

### For Developers
1. Clone this repository
```bash
git clone https://github.com/yourusername/roofer-assist.git
cd roofer-assist
```

2. Install dependencies
```bash
npm install
```

3. Build the extension
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

## 📖 Documentation

For detailed usage instructions and features, see our [Usage Guide](USAGE_GUIDE.md).

## 🔧 Development

This extension is built with:
- React + Vite for the popup UI
- Chrome Extension Manifest V3
- Modern JavaScript (ES6+)

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Run tests
npm run test
```

## 📦 Building for Production

1. Update version in `manifest.json` and `package.json`
2. Build the extension:
```bash
npm run build
```
3. The production-ready extension will be in the `dist` folder
4. Zip the contents of `dist` for Chrome Web Store submission

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React and Vite
- Uses Google Maps and Bing Maps APIs
- Icon design by [Designer Name]