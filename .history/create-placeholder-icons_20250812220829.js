const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
}

// Simple PNG generator for placeholder icons
function createPlaceholderIcon(width, height, color, filename) {
    // PNG header and IHDR chunk
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdrLength = Buffer.from([0x00, 0x00, 0x00, 0x0D]);
    const ihdrType = Buffer.from('IHDR');
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 2;  // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    // Calculate IHDR CRC
    const crc = require('crypto').createHash('crc32').update(Buffer.concat([ihdrType, ihdrData])).digest();

    // Simple IDAT chunk with a solid color
    const pixelData = Buffer.alloc(width * height * 3 + height);
    let offset = 0;
    for (let y = 0; y < height; y++) {
        pixelData[offset++] = 0; // filter type
        for (let x = 0; x < width; x++) {
            pixelData[offset++] = color[0]; // R
            pixelData[offset++] = color[1]; // G
            pixelData[offset++] = color[2]; // B
        }
    }

    // Compress pixel data (simple deflate)
    const compressed = require('zlib').deflateSync(pixelData);
    const idatLength = Buffer.from([0x00, 0x00, 0x00, compressed.length]);
    const idatType = Buffer.from('IDAT');
    const idatCrc = require('crypto').createHash('crc32').update(Buffer.concat([idatType, compressed])).digest();

    // IEND chunk
    const iendLength = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const iendType = Buffer.from('IEND');
    const iendCrc = require('crypto').createHash('crc32').update(iendType).digest();

    // Combine all chunks
    const png = Buffer.concat([
        pngSignature,
        ihdrLength,
        ihdrType,
        ihdrData,
        crc,
        idatLength,
        idatType,
        compressed,
        idatCrc,
        iendLength,
        iendType,
        iendCrc
    ]);

    fs.writeFileSync(path.join('icons', filename), png);
}

// Create placeholder icons in red color
const redColor = [220, 53, 69]; // Bootstrap danger red

createPlaceholderIcon(16, 16, redColor, 'icon16.png');
createPlaceholderIcon(32, 32, redColor, 'icon32.png');
createPlaceholderIcon(48, 48, redColor, 'icon48.png');
createPlaceholderIcon(128, 128, redColor, 'icon128.png');

console.log('✅ Placeholder icons created successfully!');
console.log('📁 Files created:');
console.log('   - icons/icon16.png');
console.log('   - icons/icon32.png');
console.log('   - icons/icon48.png');
console.log('   - icons/icon128.png');
