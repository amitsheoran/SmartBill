const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Regular.ttf';
const dest = path.join(__dirname, 'src', 'assets', 'robotoBase64.ts');

console.log('Downloading Roboto font from Google Fonts...');

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Request Failed. Status Code: ${res.statusCode}`);
    res.resume();
    return;
  }

  const data = [];
  res.on('data', (chunk) => {
    data.push(chunk);
  });

  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const base64 = buffer.toString('base64');
    
    // Create assets directory if not exists
    const assetsDir = path.dirname(dest);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const content = `export const robotoBase64 = "${base64}";\n`;
    fs.writeFileSync(dest, content);
    console.log(`Success! Font base64 written to ${dest} (Size: ${Math.round(content.length / 1024)} KB)`);
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
