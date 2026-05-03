const https = require('https');
const fs = require('fs');

const trails = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/socal-offroaders-v3/src/data/trails.json', 'utf8'));

// Extract unique image URLs
const imageUrls = [...new Set(trails.map(t => t.image))];

console.log(`Found ${imageUrls.length} unique images across ${trails.length} trails\n`);
console.log('Testing if Unsplash URLs are valid (not hallucinated)...\n');

function checkImage(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      resolve({ 
        url, 
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length']
      });
    });
    req.on('error', (e) => resolve({ url, status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, status: 'TIMEOUT' }); });
    req.end();
  });
}

async function verify() {
  const results = { valid: [], invalid: [] };
  
  for (const url of imageUrls) {
    const result = await checkImage(url);
    const isImage = result.contentType && result.contentType.startsWith('image/');
    
    if (result.status === 200 && isImage) {
      console.log(`✓ VALID: ${url.substring(0, 60)}... (${result.contentType})`);
      results.valid.push(url);
    } else {
      console.log(`✗ INVALID: ${url.substring(0, 60)}... (${result.status})`);
      results.invalid.push({ url, status: result.status, error: result.error });
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Valid: ${results.valid.length}, Invalid: ${results.invalid.length}`);
  
  if (results.invalid.length > 0) {
    console.log('\nHallucinated (fake) image URLs:');
    results.invalid.forEach(i => console.log(`  - ${i.url}`));
  }
}

verify();
