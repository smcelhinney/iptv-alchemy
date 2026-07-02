#!/usr/bin/env node

/**
 * Generate PNG icons from SVG for iOS and PWA
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563EB" rx="96"/>
  <rect x="96" y="96" width="320" height="320" rx="32" fill="none" stroke="white" stroke-width="32"/>
  <line x1="224" y1="96" x2="224" y2="416" stroke="white" stroke-width="32"/>
  <line x1="96" y1="208" x2="224" y2="208" stroke="white" stroke-width="32"/>
  <line x1="96" y1="304" x2="224" y2="304" stroke="white" stroke-width="32"/>
</svg>`;

const sizes = [
  { name: 'apple-touch-icon-152.png', size: 152 },
  { name: 'apple-touch-icon-167.png', size: 167 },
  { name: 'apple-touch-icon-180.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'favicon-32.png', size: 32 },
];

async function generateIcons() {
  try {
    const sharp = require('sharp');

    const publicDir = path.join(__dirname, '../public');
    const svgPath = path.join(publicDir, 'temp-icon.svg');

    // Write temp SVG
    fs.writeFileSync(svgPath, svgContent);

    // Generate each size
    for (const { name, size } of sizes) {
      const outputPath = path.join(publicDir, name);

      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name}`);
    }

    // Clean up temp file
    fs.unlinkSync(svgPath);

    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Error: sharp package not installed.');
      console.error('Run: npm install --save-dev sharp');
    } else {
      console.error('Error generating icons:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();
