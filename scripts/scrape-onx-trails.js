#!/usr/bin/env node

/**
 * ONX Trail Scraper for Southern California
 * Scrapes trail data from ONX Offroad regional pages
 * 
 * Usage: node scrape-onx-trails.js
 */

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