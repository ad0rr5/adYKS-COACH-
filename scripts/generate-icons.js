// Icon Generation Script
// Bu script gerçek PNG dosyaları oluşturmak için kullanılabilir

const fs = require('fs');
const path = require('path');

// SVG to PNG conversion için canvas kullanabiliriz
// Ancak şimdilik basit placeholder SVG'ler oluşturalım

const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const shortcutIcons = ['dashboard', 'community', 'leaderboard'];

// Ana icon SVG template
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size/8}" fill="#06B6D4"/>
  <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.15}" fill="white" opacity="0.9"/>
  <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.08}" fill="#F97316"/>
  <rect x="${size*0.43}" y="${size*0.35}" width="${size*0.14}" height="${size*0.08}" rx="${size*0.008}" fill="white"/>
  <text x="${size/2}" y="${size*0.9}" font-family="Arial, sans-serif" font-size="${size*0.1}" font-weight="bold" text-anchor="middle" fill="white">YKS</text>
</svg>`;

// Shortcut icon SVG templates
const createShortcutSVG = (type, size = 96) => {
  const icons = {
    dashboard: `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size/8}" fill="#06B6D4"/>
        <rect x="${size*0.2}" y="${size*0.2}" width="${size*0.25}" height="${size*0.25}" rx="${size*0.02}" fill="white"/>
        <rect x="${size*0.55}" y="${size*0.2}" width="${size*0.25}" height="${size*0.25}" rx="${size*0.02}" fill="white"/>
        <rect x="${size*0.2}" y="${size*0.55}" width="${size*0.25}" height="${size*0.25}" rx="${size*0.02}" fill="white"/>
        <rect x="${size*0.55}" y="${size*0.55}" width="${size*0.25}" height="${size*0.25}" rx="${size*0.02}" fill="white"/>
      </svg>`,
    community: `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size/8}" fill="#06B6D4"/>
        <circle cx="${size*0.35}" cy="${size*0.35}" r="${size*0.1}" fill="white"/>
        <circle cx="${size*0.65}" cy="${size*0.35}" r="${size*0.1}" fill="white"/>
        <circle cx="${size*0.5}" cy="${size*0.6}" r="${size*0.1}" fill="white"/>
        <path d="M${size*0.25} ${size*0.75} Q${size*0.5} ${size*0.65} ${size*0.75} ${size*0.75}" stroke="white" stroke-width="${size*0.03}" fill="none"/>
      </svg>`,
    leaderboard: `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size/8}" fill="#06B6D4"/>
        <rect x="${size*0.4}" y="${size*0.2}" width="${size*0.2}" height="${size*0.5}" fill="#F97316"/>
        <rect x="${size*0.2}" y="${size*0.35}" width="${size*0.15}" height="${size*0.35}" fill="white"/>
        <rect x="${size*0.65}" y="${size*0.4}" width="${size*0.15}" height="${size*0.3}" fill="white"/>
        <polygon points="${size*0.5},${size*0.15} ${size*0.45},${size*0.25} ${size*0.55},${size*0.25}" fill="white"/>
      </svg>`
  };
  return icons[type] || icons.dashboard;
};

console.log('Icon generation script created!');
console.log('To generate real PNG files, you would need:');
console.log('1. Install canvas: npm install canvas');
console.log('2. Use canvas to convert SVG to PNG');
console.log('3. Save files to public/icons/ directory');

// Örnek kullanım:
// iconSizes.forEach(size => {
//   const svg = createIconSVG(size);
//   fs.writeFileSync(`public/icons/icon-${size}x${size}.svg`, svg);
// });

module.exports = {
  createIconSVG,
  createShortcutSVG,
  iconSizes,
  shortcutIcons
};