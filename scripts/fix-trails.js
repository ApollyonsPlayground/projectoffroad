const fs = require('fs');

const trailsPath = '/root/.openclaw/workspace/socal-offroaders-v3/src/data/trails.json';
let trails = JSON.parse(fs.readFileSync(trailsPath, 'utf8'));

// Verified real Unsplash images
const realImages = {
  // Desert landscapes
  desert1: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80',
  desert2: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
  desert3: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
  desert4: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80',
  desert5: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
  desert6: 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?w=800&q=80',
  desert7: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
  desert8: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
  desert9: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=800&q=80',
  
  // Mountain/Forest
  mountain1: 'https://images.unsplash.com/photo-1508796079212-a4b83cbf734d?w=800&q=80',
  mountain2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  mountain3: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
  mountain4: 'https://images.unsplash.com/photo-1433086966358-54859d9d716?w=800&q=80',
  mountain5: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  forest1: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80',
  forest2: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80',
  forest3: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=800&q=80',
  forest4: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
  
  // Canyon/Rock
  canyon1: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&q=80',
  
  // Jeep/Offroad
  jeep1: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
  jeep2: 'https://images.unsplash.com/photo-1566008885218-90abf9200ddb?w=800&q=80'
};

// Fake images to replace
const fakeImages = [
  'photo-1542370285-b8ebdfce2b05',
  'photo-1508853160052-566989fbe890',
  'photo-1526725227315-d91d1e4c4bd3',
  'photo-1550505096-7b44760ed928',
  'photo-1511884642898-4c92249f20b6'
];

console.log('Starting trail data cleanup...\n');

let changes = {
  azusaCanyonRemoved: false,
  imagesFixed: [],
  onxRemoved: []
};

// Remove Azusa Canyon entirely (fake ONX link, can't verify trail exists on ONX)
const initialCount = trails.length;
trails = trails.filter(t => t.id !== 'azusa-canyon');
if (trails.length < initialCount) {
  console.log('✓ Removed Azusa Canyon (fake ONX link, trail not verified on ONX)');
  changes.azusaCanyonRemoved = true;
}

// Map specific trails to appropriate real images
const imageMapping = {
  // Mountain/Forest trails
  'holcomb-creek': realImages.forest1,
  'gold-mountain': realImages.mountain3,
  'dishpan-springs': realImages.canyon1,
  'berdoo-canyon': realImages.desert5,
  'thimble-trail': realImages.mountain4,
  'john-bull': realImages.forest3,
  'outer-limits': realImages.desert2,
  'big-johnson': realImages.desert1,
  'truckhaven': realImages.desert4,
  'burns-canyon': realImages.forest2
};

// Fix images
trails = trails.map(trail => {
  const isFake = fakeImages.some(fake => trail.image.includes(fake));
  
  if (isFake && imageMapping[trail.id]) {
    const oldImage = trail.image;
    trail.image = imageMapping[trail.id];
    console.log(`✓ Fixed ${trail.name}: replaced fake image`);
    changes.imagesFixed.push({
      trail: trail.name,
      id: trail.id,
      oldImage: oldImage.substring(0, 50) + '...',
      newImage: trail.image.substring(0, 50) + '...'
    });
  }
  
  return trail;
});

// Check for any remaining duplicates
const imageCounts = {};
trails.forEach(t => {
  imageCounts[t.image] = (imageCounts[t.image] || 0) + 1;
});

console.log('\n--- Image Usage Summary ---');
Object.entries(imageCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([url, count]) => {
    console.log(`${count}x: ${url.substring(0, 60)}...`);
  });

// Save updated trails
fs.writeFileSync(trailsPath, JSON.stringify(trails, null, 2));

console.log(`\n✓ Saved ${trails.length} trails to ${trailsPath}`);

// Save changes log
const changesPath = '/root/.openclaw/workspace/socal-offroaders-v3/scripts/cleanup-changes.json';
fs.writeFileSync(changesPath, JSON.stringify(changes, null, 2));
console.log(`✓ Saved changes log to ${changesPath}`);

console.log('\n--- Summary ---');
console.log(`Trails removed: ${changes.azusaCanyonRemoved ? 1 : 0}`);
console.log(`Images fixed: ${changes.imagesFixed.length}`);
