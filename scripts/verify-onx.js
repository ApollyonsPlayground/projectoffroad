const fs = require('fs');
const https = require('https');

const TRAILS_FILE = '/root/.openclaw/workspace/socal-offroaders-v3/src/data/trails.json';
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', NC = '\x1b[0m';

const trails = JSON.parse(fs.readFileSync(TRAILS_FILE, 'utf8'));

console.log('='.repeat(60));
console.log('ONX Trail Link Verifier - v3 Branch');
console.log('Testing all onxUrl values against ONX actual website');
console.log('='.repeat(60));
console.log(`Found ${trails.length} trails\n`);

const invalid = [];
const errors = [];

function checkUrl(url) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'HEAD',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)'
                }
            };

            const req = https.request(options, (res) => {
                resolve({ statusCode: res.statusCode, finalUrl: res.headers.location });
            });

            req.on('error', (error) => {
                resolve({ statusCode: 'ERROR', error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ statusCode: 'TIMEOUT' });
            });

            req.end();
        } catch (e) {
            resolve({ statusCode: 'INVALID_URL', error: e.message });
        }
    });
}

async function verifyTrails() {
    console.log('-'.repeat(60));
    
    for (const trail of trails) {
        if (!trail.onxUrl) {
            console.log(`${YELLOW}SKIP${NC}    [${trail.id}] ${trail.name} - No onxUrl`);
            continue;
        }

        const result = await checkUrl(trail.onxUrl);
        
        if (result.statusCode === 200) {
            console.log(`${GREEN}✓ VALID${NC}   [${trail.id}] ${trail.name}`);
        } else if (result.statusCode === 404) {
            console.log(`${RED}✗ INVALID${NC} [${trail.id}] ${trail.name}`);
            console.log(`         URL: ${trail.onxUrl}`);
            invalid.push({ id: trail.id, name: trail.name, url: trail.onxUrl });
        } else if (result.statusCode === 301 || result.statusCode === 302) {
            console.log(`${YELLOW}→ REDIRECT${NC} [${trail.id}] ${trail.name} (${result.statusCode})`);
            console.log(`         URL: ${trail.onxUrl}`);
        } else {
            console.log(`${YELLOW}? ERROR${NC}   [${trail.id}] ${trail.name} (${result.statusCode})`);
            console.log(`         URL: ${trail.onxUrl}`);
            if (result.error) console.log(`         Error: ${result.error}`);
            errors.push({ id: trail.id, name: trail.name, url: trail.onxUrl, status: result.statusCode, error: result.error });
        }
        
        // Be nice to ONX servers
        await new Promise(r => setTimeout(r, 600));
    }
    
    console.log('-'.repeat(60));
    console.log('\nSUMMARY:');
    console.log(`  Valid:   ${trails.length - invalid.length - errors.length}`);
    console.log(`  Invalid: ${invalid.length}`);
    console.log(`  Errors:  ${errors.length}`);
    console.log('');
    
    if (invalid.length > 0) {
        console.log(`${RED}INVALID/Fake URLs that need fixing:${NC}`);
        console.log('');
        for (const item of invalid) {
            console.log(`  Trail: ${item.name} (${item.id})`);
            console.log(`  Fake URL: ${item.url}`);
            console.log('');
        }
        
        // Save to file
        fs.writeFileSync('/root/.openclaw/workspace/socal-offroaders-v3/INVALID_ONX_URLS.json', JSON.stringify(invalid, null, 2));
        console.log(`Saved invalid URLs to: INVALID_ONX_URLS.json`);
        
        process.exit(1);
    } else if (errors.length > 0) {
        console.log(`${YELLOW}Some links returned errors (not 404s).${NC}`);
        console.log('This might be network issues or rate limiting.');
        process.exit(2);
    } else {
        console.log(`${GREEN}✓ All ONX trail links are valid!${NC}`);
        process.exit(0);
    }
}

verifyTrails().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
