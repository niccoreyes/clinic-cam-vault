# Generating PWA icons with OpenAI (gpt-image-1)

## Requirements
- Node.js or Bun installed
- Install dependencies: `bun add dotenv sharp` (or `npm install dotenv sharp`)
- Copy `.env.template` to `.env` and set your OpenAI API key

## How to Run
- From project root:
  ```sh
  bun run scripts/generate-icons.cjs
  # or
  node scripts/generate-icons.cjs
  ```
- The script will:
  1. Generate a single 1024x1024 PNG icon using OpenAI's API
  2. Resize it to all required icon sizes using `sharp`

## Output
- `public/assets/icons/icon-192.png`
- `public/assets/icons/icon-256.png`
- `public/assets/icons/icon-384.png`
- `public/assets/icons/icon-512.png` (maskable)
- `public/assets/icons/apple-touch-icon.png`
- `public/assets/icons/icon-1024.png` (base image)

## Manifest Integration
- All generated icons are referenced in `public/manifest.json` for best installability on desktop and mobile.
- The 512x512 icon is marked as `maskable` for Android/Chrome.
- The 180x180 icon is used for iOS/Apple devices.

## Notes
- Generated images may not be perfect at small sizes; consider using an SVG source or editing in an image tool to optimize clarity.
- If you want to tweak the prompt or style, edit the prompt in `scripts/generate-icons.cjs` and re-run.
- `.env` is used for secrets and is git-ignored.
