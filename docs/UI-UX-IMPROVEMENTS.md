# Project Offroad - UI/UX Improvement Spec

## Priority: MOBILE FIRST 📱

This is a PWA app - must feel native on mobile.

---

## Phase 1: Smoothness & Feel (Quick Wins)

### 1.1 Skeleton Loaders ✅ DONE
- Add shimmer loading placeholders while Supabase fetches
- Matches Instagram/TikTok skeleton style
- Files: `src/components/SkeletonLoader.tsx`

### 1.2 View Transitions ✅ DONE
- Use View Transition API for smooth page navigations
- Replace instant page loads with animated transitions
- File: `src/components/ViewTransitions.tsx`

### 1.3 Optimistic UI Feedback
- Toast/snackbar confirmations for actions (like, comment, post)
- Success/error feedback without blocking
- File: `src/components/Toast.tsx` (ready to integrate)

### 1.4 Haptic Hierarchy ✅ DONE
- Light haptics: navigation taps
- Medium haptics: button presses, likes
- Heavy haptics: errors, important actions
- Hook: `src/hooks/useHaptics.ts`

---

## Phase 2: Engagement Features

### 2.1 Stories
- 24hr ephemeral content at top of feed
- Horizontal swipe between stories
- Tap to view, swipe to next

### 2.2 Save/Bookmark
- Save posts to personal collection
- View saved posts in profile

### 2.3 Trending Section
- Trending trails/clubs/rigs
- Algorithm-based recommendations

---

## Phase 3: Polish

### 3.1 Empty States
- Illustrated empty states with CTAs
- Not just text - nice graphics

### 3.2 Pull-to-Refresh
- Custom spinner
- Haptic on trigger

### 3.3 Image Loading
- Blur-up progressive loading
- Low-res placeholder → full image

---

## Current Issues to Fix
1. No skeleton loaders while Supabase fetches ✅ FIXED
2. No view transitions between pages ✅ FIXED
3. No optimistic UI confirmations ⏳ (Toast ready, needs integration)
4. No haptic hierarchy ✅ FIXED
5. Menu button covered by warning banner ✅ FIXED

---

## 🎯 Runs & Clubs Architecture (NEW)

### Clubs Page - Location-Sorted Directory
- **UI:** Like a feed but club cards sorted by distance (closest to you)
- **Card:** Club poster with logo, name, location, member count
- **Click action:** Opens sheet/modal with social links (Instagram, Facebook, website)
- **No complex logic** - just a directory with geolocation sorting

### Runs Page - Live Experience
- **Join flow:** User joins run → automatically joins live chat room
- **Host controls:** Host starts run → initiates live voice/text chat
- **Live features:**
  - Real-time chat room (Supabase Realtime)
  - Voice chat (need to integrate - maybe Daily.co, Agora, or WebRTC)
  - Live location sharing (optional, privacy-controlled)
  - SOS emergency button
- **Status states:** Upcoming → Active → Completed

### Technical Needs:
- Supabase Realtime for chat
- Voice chat provider (Daily.co, Agora, or Twilio)
- Location services (browser geolocation)
- Run status tracking in database

---

*Last updated: 2026-04-26*