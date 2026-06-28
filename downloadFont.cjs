const fs = require('fs');
const path = require('path');

const url = 'https://github.com/googlefonts/roboto-2/raw/main/src/hinted/Roboto-Regular.ttf';
const dest = path.join(__dirname, 'src', 'assets', 'robotoBase64.ts');

console.log('Downloading Roboto font from Google Fonts using fetch...');

async function run() {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    const assetsDir = path.dirname(dest);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const content = `export const robotoBase64 = "${base64}";\n`;
    fs.writeFileSync(dest, content);
    console.log(`Success! Font base64 written to ${dest} (Size: ${Math.round(content.length / 1024)} KB)`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
