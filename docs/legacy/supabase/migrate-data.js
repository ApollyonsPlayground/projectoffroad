// Data Migration Script: JSON to Supabase
// Usage: Run in Supabase SQL Editor after creating tables

const trailsData = require('../src/data/trails.json');
const runsData = require('../src/data/runs.json');

console.log('-- MIGRATION SCRIPT: JSON to Supabase');
console.log('-- Run this in Supabase SQL Editor after creating tables');
console.log('');

// Generate INSERT statements for trails
console.log('-- ============================================');
console.log('-- INSERT TRAILS');
console.log('-- ============================================');
console.log('');

trailsData.forEach((trail, index) => {
  const slug = trail.onxUrl.split('/').pop() || trail.id;
  
  console.log(`INSERT INTO trails (title, location, difficulty, difficulty_level, rig_requirements, onx_slug, coordinates, status, image_url, distance, time_estimate, description, terrain) VALUES (`);
  console.log(`  '${escapeSql(trail.name)}',`);
  console.log(`  '${escapeSql(trail.location)}',`);
  console.log(`  '${trail.difficulty}',`);
  console.log(`  '${escapeSql(trail.difficultyLevel)}',`);
  console.log(`  '${escapeSql(trail.rigRequirements)}',`);
  console.log(`  '${escapeSql(slug)}',`);
  console.log(`  '${trail.coordinates}',`);
  console.log(`  '${trail.status}',`);
  console.log(`  '${trail.image}',`);
  console.log(`  '${escapeSql(trail.distance)}',`);
  console.log(`  '${escapeSql(trail.time)}',`);
  console.log(`  '${escapeSql(trail.description)}',`);
  console.log(`  '${trail.terrain}'`);
  console.log(`);`);
  console.log('');
});

// Generate INSERT statements for runs
console.log('-- ============================================');
console.log('-- INSERT RUNS');
console.log('-- ============================================');
console.log('');

runsData.forEach((run, index) => {
  console.log(`-- Run: ${run.title}`);
  console.log(`-- Link to trail via subquery`);
  console.log(`INSERT INTO runs (title, date, meetup_location, description, difficulty, max_rigs, rigs_joined, trail_id, is_verified, organizer_name, organizer_instagram) VALUES (`);
  console.log(`  '${escapeSql(run.title)}',`);
  console.log(`  '${run.date}',`);
  console.log(`  '${escapeSql(run.meetupPoint.name)}',`);
  console.log(`  '${escapeSql(run.description)}',`);
  console.log(`  '${run.difficulty}',`);
  console.log(`  ${run.maxRigs},`);
  console.log(`  ${run.joinedCount},`);
  console.log(`  (SELECT id FROM trails WHERE onx_slug = '${run.trail}' LIMIT 1),`);
  console.log(`  true,`);
  console.log(`  '${escapeSql(run.organizer.name)}',`);
  console.log(`  '${escapeSql(run.organizer.instagram)}'`);
  console.log(`);`);
  console.log('');
});

function escapeSql(str) {
  return str.replace(/'/g, "''");
}