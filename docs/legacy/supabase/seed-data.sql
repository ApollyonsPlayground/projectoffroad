-- ============================================
-- DATA MIGRATION: JSON to Supabase
-- Run this after creating the schema
-- ============================================

-- ============================================
-- INSERT ALL 22 TRAILS
-- ============================================

INSERT INTO trails (title, location, difficulty, difficulty_level, rig_requirements, onx_slug, coordinates, status, image_url, distance, time_estimate, description, terrain) VALUES
('Cleghorn Fire Road (2N47)', 'Cajon Pass / San Bernardino', 'Beginner', 'Easy to Moderate', 'Stock 4WD / High-Clearance Recommended', 'cleghorn-fire-road-2n47', '34.3031, -117.4524', 'Open', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', '12 miles', '3-4 hours', 'Ridge run with incredible views. The main road is 2WD friendly; offshoots require 4x4. Perfect introduction to mountain wheeling with panoramic vistas of the Cajon Pass.', 'mountain'),
('Santiago Peak (Main Divide)', 'Cleveland National Forest', 'Advanced', 'Moderate to Advanced', 'Lifted / 33" Tires / Skid Plates', 'santiago-peak-main-divide', '33.7111, -117.5332', 'Seasonal', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', '18 miles', '5-6 hours', 'The highest point in Orange County. Rutted climbs and steep drop-offs. Epic panoramic views from the summit make the challenge worthwhile. Check weather before attempting.', 'mountain'),
('Lytle Creek / Stockton Flats', 'Lytle Creek, CA', 'Beginner', 'Easy', 'Stock 4WD / All-Terrain Tires', 'stockton-flats', '34.2583, -117.5025', 'Open', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', '10 miles', '2-3 hours', 'Perfect for a quick run. Light water crossings and shaded campsites along the creek. Great for families and beginner groups looking to practice water crossing techniques.', 'canyon'),
('Holcomb Creek', 'Big Bear / Holcomb Valley', 'Advanced', 'Advanced', 'Lifted / 35" Tires / Lockers / Skid Plates', 'holcomb-creek', '34.2578, -117.0894', 'Open', 'https://images.unsplash.com/photo-1542370285-b8ebdfce2b05?w=800&q=80', '8 miles', '3-5 hours', 'Iconic rock crawling trail. The Gatekeeper sets the tone - if you can''t clear it, turn back. Holcomb Creek crossing and deep ruts make this a must-do for experienced wheelers.', 'rock'),
('Gold Mountain (3N69)', 'Big Bear / Baldwin Lake', 'Advanced', 'Moderate to Advanced', 'Lifted / 33" Tires / Skid Plates Recommended', 'gold-mountain-3n69', '34.2722, -116.8247', 'Open', 'https://images.unsplash.com/photo-1533871368526-5a4464db9460?w=800&q=80', '12 miles', '4-5 hours', 'Starts easy, ends challenging. The rock garden at the summit tests both driver and rig. Nylon strap recommended - this trail is notorious for body damage. Unmatched summit views of Baldwin Lake.', 'rock'),
('Dishpan Springs', 'Big Bear Lake', 'Extreme', 'Extreme', 'Heavy Mods / 37"+ Tires / Lockers / Armor / Winch', 'dishpan-springs', '34.2347, -117.0469', 'Open', 'https://images.unsplash.com/photo-1508853160052-566989fbe890?w=800&q=80', '5 miles', '4-6 hours', 'The big leagues. Deep bowls, off-camber climbs, and shelf roads that''ll test the best-built rigs. Named for the bathtub-size springs. Bring recovery gear and expect body damage.', 'rock'),
('Mojave Road (West/Central)', 'Mojave National Preserve', 'Beginner', 'Easy to Moderate', 'Stock 4WD / Extra Fuel / Self-Recovery', 'mojave-road', '35.1489, -115.9033', 'Open', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80', '140 miles', '2-3 days', 'Historic desert crossing from Colorado River to Barstow. Sand, lava tubes, volcanic formations, and the iconic Mojave mailbox. Bring extra fuel and water. Multiple access points for shorter sections.', 'desert'),
('Ocotillo Wells SVRA', 'Ocotillo Wells, CA', 'Moderate', 'Moderate', 'Stock 4WD / All-Terrain Tires / Flag Required', 'ocotillo-wells-svra', '33.1439, -116.1347', 'Open', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80', 'Varies', 'Full Day', 'California''s largest OHV area. Sand dunes, badlands, mud caves, and slot canyons. Blowsand Hill tests your climbing skills. Great camping at Quinn''s Bar or Primitive areas.', 'desert'),
('Berdoo Canyon', 'Joshua Tree National Park', 'Advanced', 'Moderate to Advanced', 'High Clearance / Skid Plates / Extra Fuel', 'berdoo-canyon', '33.9014, -116.1481', 'Open', 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80', '20 miles', '4-6 hours', 'Old road through Joshua Tree connecting Berdoo Canyon to Geology Tour Road. Rocky sections in Golden Bee Canyon require careful line choice. Joins Pinyon Well/Malapai Hill trails. Permit required.', 'desert'),
('Coxey Road (10S01)', 'Big Bear / Fawnskin', 'Beginner', 'Easy', 'Stock 4WD / All-Terrain Tires', 'coxey-road-10s01', '34.2850, -117.0944', 'Open', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80', '15 miles', '2-3 hours', 'Easy fire road perfect for beginners. Winding through pine forests with multiple spur roads for dispersed camping. Great for testing new rigs or beginners wanting to gain confidence.', 'forest'),
('Rainbow Trail', 'Big Bear / Baldwin Lake', 'Moderate', 'Moderate', 'Stock 4WD / 33" Tires Recommended', 'rainbow-trail', '34.3306, -116.8989', 'Open', 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80', '8 miles', '3-4 hours', 'Rolling forest trail with steady elevation gains. Winding through pine and cedar groves, this trail offers a gentle challenge with rewarding views of Baldwin Lake and the San Gorgonio peaks.', 'forest'),
('Gold Fever Trail', 'El Dorado County', 'Moderate', 'Moderate', 'Stock 4WD / High Clearance', 'gold-fever-trail', '38.6833, -120.6333', 'Open', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', '12 miles', '3-4 hours', 'Historic gold rush wagon route from 1849. Connects Placerville to Lake Tahoe region. Multiple water crossings and sections that challenged 49ers wagons. Historic markers and scenic Sierra views.', 'mountain'),
('Dumont Dunes', 'Death Valley Area', 'Moderate', 'Easy to Extreme', '4WD / Wide Tires / Flag Required / Air Down', 'dumont-dunes', '35.5639, -116.2511', 'Open', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80', 'Varies', 'Full Day', 'The tallest dunes in California. Competition Hill separates the brave from the willing. Wide-open sand playground with extreme terrain on the steep faces. Camping at roadside sites or competition areas.', 'desert'),
('Thimble Trail', 'San Jacinto Mountains', 'Advanced', 'Moderate to Advanced', 'Lifted / 32" Tires / Skid Plates', 'thimble-trail', '33.7361, -116.7242', 'Open', 'https://images.unsplash.com/photo-1511884642898-4c92249f20b6?w=800&q=80', '6 miles', '2-3 hours', 'Narrow shelf road winding through pine forest. Steep drop-offs and tight turns require precision. Named for Thimble Peak visible along the route. Challenging without being extreme.', 'mountain'),
('John Bull Trail', 'Big Bear / Holcomb Valley', 'Extreme', 'Extreme', 'Heavily Modified / 35"+ Tires / Lockers / Winch / Armor', 'john-bull-trail', '34.2983, -117.0750', 'Open', 'https://images.unsplash.com/photo-1542370285-b8ebdfce2b05?w=800&q=80', '6 miles', '4-6 hours', 'The Gatekeeper stops most stock rigs. Deep ruts, massive ledges, and tight squeezes. Legendary for eating body panels. Only attempt with heavily modified rigs and experienced spotters.', 'rock'),
('Odessa-Doran Loop', 'Big Bear / Holcomb Valley', 'Advanced', 'Moderate to Advanced', 'Lifted / 33" Tires / Skid Plates', 'odessa-doran-loop', '34.2458, -117.0933', 'Open', 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80', '10 miles', '3-4 hours', 'Popular loop connecting historic Holcomb Valley sites. Odessa Campground to Doran Regional Park. Mix of fire road and technical rock sections. Multiple creek crossings and historic ruins.', 'forest'),
('Outer Limits', 'Johnson Valley', 'Extreme', 'Extreme', 'Rock Buggy / Trophy Truck / Experience Essential', 'outer-limits', '34.3833, -116.6167', 'Open', 'https://images.unsplash.com/photo-1508853160052-566989fbe890?w=800&q=80', '4 miles', '3-5 hours', 'Part of the King of the Hammers course. Extreme rock crawling and high-speed desert sections. Home base for Ultra4 racing. Watch lunatics attempt Chocolate Cliffs. Spectating only for most.', 'rock'),
('Jack North Trail', 'Johnson Valley', 'Moderate', 'Moderate to Advanced', 'Stock 4WD / 33" Tires / Skid Plates', 'jack-north-trail', '34.4167, -116.6500', 'Open', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80', '12 miles', '3-4 hours', 'Rolling desert trail with scenic views of Johnson Valley and surrounding ranges. Mix of sandy whoops and rocky sections. Great warm-up for nearby extreme trails. Good sunset views.', 'desert'),
('Big Johnson', 'Johnson Valley', 'Advanced', 'Advanced', 'Lifted / 35" Tires / Lockers', 'big-johnson', '34.3767, -116.6000', 'Open', 'https://images.unsplash.com/photo-1508853160052-566989fbe890?w=800&q=80', '8 miles', '2-4 hours', 'Named with humor, this trail delivers serious challenges. Steep rock ledges and tight squeezes test articulation and approach angles. Popular for Saturday afternoon wheeling.', 'rock'),
('Idyllwild Mountain Road', 'San Jacinto Mountains', 'Beginner', 'Easy', 'Any Vehicle / Pavement Ends', 'idyllwild-mountain-road', '33.7447, -116.7156', 'Open', 'https://images.unsplash.com/photo-1511884642898-4c92249f20b6?w=800&q=80', '18 miles', '2-3 hours', 'Scenic mountain road from Hemet to Idyllwild. Paved then graded dirt through pine forests of the San Jacinto Mountains. Cool escape from summer heat. Multiple overlook viewpoints.', 'mountain'),
('Truckhaven Trail', 'Salton Sea Area', 'Moderate', 'Moderate to Advanced', '4WD / All-Terrain Tires / Extra Fuel', 'truckhaven-trail', '33.3056, -116.0917', 'Open', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80', '14 miles', '4-5 hours', 'Historic route through badlands near the Salton Sea. Winding climbs and descents with dramatic valley views. Named for the truck that first conquered the terrain in the 1920s.', 'desert'),
('Azusa Canyon (East Fork)', 'San Gabriel Mountains', 'Beginner', 'Easy to Moderate', 'Stock 4WD / High Clearance', 'azusa-canyon', '34.1867, -117.8469', 'Open', 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80', '10 miles', '2-3 hours', 'Mountain canyon following the East Fork of the San Gabriel River. Multiple water crossings and shaded campsites. Popular weekend spot. Bridge Out means actual river crossings required.', 'canyon');

-- ============================================
-- INSERT VERIFIED RUNS
-- ============================================

INSERT INTO runs (title, date, meetup_location, description, difficulty, max_rigs, rigs_joined, trail_id, is_verified, organizer_name, organizer_instagram) 
SELECT 
  '🌅 Sunset Ridge Run',
  '2026-03-28T16:00:00',
  'Cleghorn Trailhead',
  'Join us for a scenic evening run up Cleghorn Ridge. We''ll catch sunset at the overlook and have a group campfire at the top. Bring your own firewood and beverages.',
  'Beginner',
  15,
  7,
  id,
  true,
  'Noah',
  '@noah2131'
FROM trails WHERE onx_slug = 'cleghorn-fire-road-2n47';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify trail count
SELECT 'Trails inserted: ' || COUNT(*) FROM trails;

-- Verify run count
SELECT 'Runs inserted: ' || COUNT(*) FROM runs;