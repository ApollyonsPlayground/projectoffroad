#!/usr/bin/env node

/**
 * ONX Trail Scraper for Southern California
 * Scrapes trail data from ONX Offroad regional pages
 * 
 * Usage: node scrape-onx-trails.js
 */

const BASE_URL = 'https://www.onxmaps.com/offroad';

// Southern California regions to scrape
const REGIONS = [
  { name: 'Big Bear Lake', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/big-bear-lake-ca' },
  { name: 'San Diego', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/san-diego-ca' },
  { name: 'Palm Springs', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/palm-springs-ca' },
  { name: 'Joshua Tree', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/joshua-tree-ca' },
  { name: 'Rancho Santa Margarita', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/rancho-santa-margarita-ca' },
  { name: 'Temecula', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/temecula-ca' },
  { name: 'Hemet', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/hemet-ca' },
  { name: 'Lake Elsinore', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/lake-elsinore-ca' },
  { name: 'Idyllwild', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/idyllwild-ca' },
  { name: 'Cajon Pass', url: 'https://www.onxmaps.com/offroad/beginner-offroad-trails-near-me/cajon-pass-ca' },
];

// Helper to create URL slug from trail name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Helper to determine difficulty from tech rating
function getDifficulty(techRating) {
  if (!techRating) return 'Beginner';
  const rating = parseInt(techRating);
  if (rating <= 3) return 'Beginner';
  if (rating <= 5) return 'Intermediate';
  if (rating <= 7) return 'Advanced';
  return 'Extreme';
}

// Parse the HTML and extract trail data
function extractTrails(html, region) {
  const trails = [];
  
  // Match trail blocks - looking for pattern: "### Trail Name" followed by description
  // and [Learn more about X](/offroad/trails/UUID)
  const trailBlockRegex = /###\s+([^[\n]+)[\s\S]*?\[Learn more about[^\]]+\]\(([^)]+)\)[\s\S]*?Total Miles\s*([\d.]+)[\s\S]*?Tech Rating\s*(\d+)?[\s\S]*?Best Time\s*([A-Za-z\/]+)?/g;
  
  let match;
  while ((match = trailBlockRegex.exec(html)) !== null) {
    const name = match[1].trim();
    const onxUrl = 'https://www.onxmaps.com' + match[2];
    const distance = match[3].trim();
    const techRating = match[4]?.trim() || '';
    const bestTime = match[5]?.trim() || '';
    
    // Skip duplicates
    if (trails.some(t => t.name === name)) continue;
    
    trails.push({
      name,
      onxUrl,
      distance: `${distance} miles`,
      difficulty: getDifficulty(techRating),
      bestTime: bestTime.replace(/\//g, ', '),
      region
    });
  }
  
  return trails;
}

// Alternative extraction using simpler patterns
function extractTrailsSimple(html, region) {
  const trails = [];
  
  // Find all "Learn more about X" links with their trail names
  // Pattern: ### Trail Name followed by Learn more about X link
  const pattern = /###\s+([^\n]+)[\s\S]{0,500}?\[Learn more about[^\]]+\]\(([^)]+)\)[\s\S]{0,200}?Total Miles[\s\S]{0,100}?(\d+\.?\d*)/g;
  
  let match;
  const seen = new Set();
  
  while ((match = pattern.exec(html)) !== null) {
    const name = match[1].trim();
    const path = match[2];
    const distance = match[3]?.trim() || 'Unknown';
    
    if (seen.has(name)) continue;
    seen.add(name);
    
    trails.push({
      name,
      onxUrl: `https://www.onxmaps.com${path}`,
      distance: `${distance} miles`,
      region
    });
  }
  
  return trails;
}

async function fetchPage(url) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const content = await page.content();
    return content;
  } finally {
    await browser.close();
  }
}

// If no Playwright, use fetch
async function fetchWithNode(url) {
  const { ProxyAgent } = require('proxy-agent');
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Starting ONX trail scraper...\n');
  
  const allTrails = [];
  
  for (const region of REGIONS) {
    console.log(`Scraping ${region.name}...`);
    try {
      const html = await fetchPage(region.url);
      const trails = extractTrailsSimple(html, region.name);
      console.log(`  Found ${trails.length} trails`);
      allTrails.push(...trails);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }
  
  // Remove duplicates by name
  const uniqueTrails = [];
  const seen = new Set();
  for (const trail of allTrails) {
    if (!seen.has(trail.name)) {
      seen.add(trail.name);
      uniqueTrails.push(trail);
    }
  }
  
  console.log(`\nTotal unique trails: ${uniqueTrails.length}`);
  
  // Output as JSON
  console.log('\n--- JSON Output ---');
  console.log(JSON.stringify(uniqueTrails, null, 2));
}

main().catch(console.error);