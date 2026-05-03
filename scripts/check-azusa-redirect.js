const fs = require('fs');
const https = require('https');

const TRAILS_FILE = '/root/.openclaw/workspace/socal-offroaders-v3/src/data/trails.json';

const trails = JSON.parse(fs.readFileSync(TRAILS_FILE, 'utf8'));

console.log('ONX Redirect Follower - Checking where Azusa Canyon actually goes\n');

const azusa = trails.find(t => t.id === 'azusa-canyon');
if (!azusa) {
    console.log('Azusa Canyon not found in trails data!');
    process.exit(1);
}

console.log(`Trail: ${azusa.name}`);
console.log(`Current URL: ${azusa.onxUrl}\n`);

function followRedirect(url, depth = 0) {
    return new Promise((resolve) => {
        if (depth > 5) {
            resolve({ finalUrl: url, error: 'Too many redirects' });
            return;
        }

        try {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : require('http');
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'HEAD',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            const req = protocol.request(options, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const location = res.headers.location;
                    console.log(`  Redirect ${depth + 1}: ${location}`);
                    
                    // Follow the redirect
                    const newUrl = location.startsWith('http') ? location : `https://${urlObj.hostname}${location}`;
                    followRedirect(newUrl, depth + 1).then(resolve);
                } else {
                    resolve({ 
                        finalUrl: url, 
                        statusCode: res.statusCode,
                        headers: res.headers 
                    });
                }
            });

            req.on('error', (error) => {
                resolve({ finalUrl: url, error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ finalUrl: url, error: 'Timeout' });
            });

            req.end();
        } catch (e) {
            resolve({ finalUrl: url, error: e.message });
        }
    });
}

async function check() {
    console.log('Following redirects...\n');
    const result = await followRedirect(azusa.onxUrl);
    
    console.log('\nFinal result:');
    console.log(`  Status: ${result.statusCode || 'ERROR'}`);
    console.log(`  Final URL: ${result.finalUrl}`);
    
    if (result.error) {
        console.log(`  Error: ${result.error}`);
    }
    
    // Compare URLs
    if (result.finalUrl !== azusa.onxUrl && !result.error) {
        console.log('\n⚠️  URL MISMATCH!');
        console.log('The trail redirects to a different page.');
        console.log(`\nCurrent onxUrl: ${azusa.onxUrl}`);
        console.log(`Should be:      ${result.finalUrl}`);
    }
}

check();
