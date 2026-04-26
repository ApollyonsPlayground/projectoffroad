# Project Offroad - UI/UX Improvement Spec

## Priority: MOBILE FIRST 📱

This is a PWA app - must feel native on mobile.

---

## Phase 1: Smoothness & Feel (Quick Wins)

### 1.1 Skeleton Loaders ✅ DONE
- Add shimmer loading placeholders while Supabase fetches
- Matches Instagram/TikTok skeleton style
- Files: `src/components/SkeletonLoader.tsx`

### 1.2 View Transitions
- Use View Transition API for smooth page navigations
- Replace instant page loads with animated transitions
- File: `src/app/layout.tsx`

### 1.3 Optimistic UI Feedback
- Toast/snackbar confirmations for actions (like, comment, post)
- Success/error feedback without blocking
- File: `src/components/Toast.tsx`

### 1.4 Haptic Hierarchy
- Light haptics: navigation taps
- Medium haptics: button presses, likes
- Heavy haptics: errors, important actions

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
1. No skeleton loaders while Supabase fetches
2. No view transitions between pages
3. No optimistic UI confirmations
4. No haptic hierarchy
5. Scroll lacks native momentum feel

---

*Last updated: 2026-04-26*