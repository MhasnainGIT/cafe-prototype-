/**
 * Regenerate AR.js .patt from a marker image (same algorithm as THREEx.ArPatternFile).
 * Usage: node scripts/generate-patt.mjs [input.png] [output.patt]
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inputPath = path.resolve(root, process.argv[2] || 'public/markers/webhaze-ar-marker.png');
const outputPath = path.resolve(root, process.argv[3] || 'public/pattern-webhaze_logo_6.patt');

const SIZE = 16;
const ORIENTATIONS_DEG = [0, -90, -180, -270];

function encodeChannel(data, width, height, channelOffset) {
  let out = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x !== 0) out += ' ';
      const offset = y * width * 4 + x * 4 + channelOffset;
      out += String(data[offset]).padStart(3);
    }
    out += '\n';
  }
  return out;
}

async function rasterAtRotation(source, degrees) {
  const { data, info } = await sharp(source)
    .rotate(degrees, { background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .resize(SIZE, SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function encodeImage(imagePath) {
  const source = await fs.promises.readFile(imagePath);
  let patternFileString = '';

  for (let i = 0; i < ORIENTATIONS_DEG.length; i++) {
    const { data, width, height } = await rasterAtRotation(source, ORIENTATIONS_DEG[i]);
    if (i !== 0) patternFileString += '\n';
    for (let channelOffset = 2; channelOffset >= 0; channelOffset--) {
      patternFileString += encodeChannel(data, width, height, channelOffset);
    }
  }
  return patternFileString;
}

if (!fs.existsSync(inputPath)) {
  console.error('Input image not found:', inputPath);
  process.exit(1);
}

const pattern = await encodeImage(inputPath);
await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
await fs.promises.writeFile(outputPath, pattern, 'utf8');
const lines = pattern.split('\n').length;
console.log('Wrote', outputPath, `(${lines} lines, ${pattern.length} bytes)`);
