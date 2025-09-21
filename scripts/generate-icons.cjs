/*
  Generate PWA icons using OpenAI Image API (gpt-image-1) and resize with sharp.
  Usage:
    - Set OPENAI_API_KEY in .env or environment
    - bun add sharp (or npm install sharp)
    - bun run scripts/generate-icons.cjs

  Outputs to: public/assets/icons/
  Files: icon-192.png, icon-256.png, icon-384.png, icon-512.png, apple-touch-icon.png
*/

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');
const sharp = require('sharp');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable not set.');
  console.error('Set it in your .env file or shell. See .env.template for details.');
  process.exit(1);
}

const outDir = process.env.ICON_OUTPUT_DIR || path.join(__dirname, '..', 'public', 'assets', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const images = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-256.png', size: 256 },
  { name: 'icon-384.png', size: 384 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
];

const prompt = `A clean, simple flat app icon for a medical video recorder. Centered stylized camera lens with a medical cross integrated, minimal shapes, high contrast, vector-like, easy to read at small sizes. Prefer solid color background and transparent background option for maskable icons. No text. Use a single accent color (teal / #0ea5e9) and white for foreground shapes. Output PNG with transparent background.`;

async function generateBaseImage() {
  const url = 'https://api.openai.com/v1/images/generations';
  const body = {
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  if (!data || !data.data || !data.data[0] || !data.data[0].b64_json) {
    throw new Error('Unexpected OpenAI response shape: ' + JSON.stringify(data));
  }

  return Buffer.from(data.data[0].b64_json, 'base64');
}

(async () => {
  console.log('Starting icon generation using OpenAI Images API...');
  let baseImage;
  try {
    baseImage = await generateBaseImage();
    const basePath = path.join(outDir, 'icon-1024.png');
    fs.writeFileSync(basePath, baseImage);
    console.log('Saved base icon-1024.png');
  } catch (err) {
    console.error('Failed to generate base image:', err.message || err);
    return;
  }

  for (const img of images) {
    const fullPath = path.join(outDir, img.name);
    try {
      await sharp(baseImage)
        .resize(img.size, img.size)
        .png()
        .toFile(fullPath);
      console.log(`Saved ${fullPath}`);
    } catch (err) {
      console.error(`Failed to resize ${img.name}:`, err.message || err);
    }
  }
  console.log('Done. Review the generated icons in ' + outDir + ' and tweak prompts if needed.');
})();
