/**
 * Icon Generator Script for RemmbrMe
 * 
 * This script generates all required icon sizes for Tauri from the SVG source.
 * 
 * Usage:
 *   npm install sharp
 *   node scripts/generate-icons.js
 * 
 * Or use the Tauri CLI built-in icon generation:
 *   npm run tauri icon src-tauri/icons/icon.svg
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'src-tauri', 'icons');
const svgPath = join(iconsDir, 'icon.svg');

// Icon sizes needed for Tauri
const sizes = {
  // Standard PNG icons
  '32x32.png': 32,
  '128x128.png': 128,
  '128x128@2x.png': 256,
  'icon.png': 512,
  
  // Windows Store icons
  'Square30x30Logo.png': 30,
  'Square44x44Logo.png': 44,
  'Square71x71Logo.png': 71,
  'Square89x89Logo.png': 89,
  'Square107x107Logo.png': 107,
  'Square142x142Logo.png': 142,
  'Square150x150Logo.png': 150,
  'Square284x284Logo.png': 284,
  'Square310x310Logo.png': 310,
  'StoreLogo.png': 50,
};

async function generateIcons() {
  console.log('🎨 RemmbrMe Icon Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const svgBuffer = readFileSync(svgPath);
  
  // Generate PNG icons
  for (const [filename, size] of Object.entries(sizes)) {
    const outputPath = join(iconsDir, filename);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${filename} (${size}x${size})`);
  }
  
  // Generate ICO file (Windows) - using 256x256 as base
  // Note: sharp doesn't support ICO directly, you may need to use another tool
  // or use the Tauri CLI: npm run tauri icon
  console.log('\n📝 Note: For .ico and .icns files, run:');
  console.log('   npm run tauri icon src-tauri/icons/icon.png');
  
  console.log('\n✨ Icon generation complete!');
}

generateIcons().catch(console.error);
