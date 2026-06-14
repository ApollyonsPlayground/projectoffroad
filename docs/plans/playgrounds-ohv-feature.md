# Playgrounds — persistent OHV area rooms (PLANNED)

| Field | Value |
|-------|--------|
| **Status** | Deferred — do not implement until **Apple App Store approval** |
| **Created** | 2026-06-15 |
| **Cursor plan** | `.cursor/plans/playgrounds_ohv_feature_60bba62c.plan.md` |

## Why deferred

First App Store submission should keep review scope small. Playgrounds adds a new nav tab, persistent location sharing, user-created rooms, and realtime chat in a new context — all things Apple may test during review. Ship the approved baseline first; build Playgrounds as a **post-launch** feature (web deploy + optional native rebuild only if needed).

---

## Product summary

**Playgrounds** are always-on OHV regions (not scheduled events). Users browse who's out riding, join a **preset zone** (e.g. Blowsand Hill) or spin up a **user room** ("Meet at Gecko's"), then chat and optionally share live GPS with others in that room.

**Locked-in product choices:**

- **Rooms:** preset zones **and** user-created rooms within each playground
- **Creation:** admin-seeded for MVP; community-proposed playgrounds later

Runs stay for planned group rides; Playgrounds are for spontaneous "who's at Ocotillo today?" coordination.

---

## Architecture (high level)

```
/playgrounds                    → list + rider counts
/playgrounds/[slug]             → hub: zones + open user rooms
/playgrounds/[slug]/rooms/[id]  → chat + live map for one room
```

**Tables:** `playgrounds`, `playground_zones`, `playground_rooms`, `playground_room_members`, `playground_messages`, `playground_locations`

**Reuse from runs:** `RunLiveMap` pattern, location upsert RPC style, chat realtime pattern, Leaflet basemaps.

**Do not** overload `runs` with a playground kind — dedicated tables avoid cron/expiry/guest-invite conflicts.

---

## MVP scope (when approved to build)

1. Migration + seed (Ocotillo Wells, Dumont, Johnson Valley, Hungry Valley + preset zones)
2. List, hub, room pages + BottomNav entry
3. Join/leave (one room per playground per user), chat, opt-in live map
4. Admin CRUD for playgrounds and zones
5. Trail detail CTA where `trail_id` links to a playground

## Later phases

- Push when friends join an area
- Community-proposed playgrounds + moderation
- Geofence hints, SOS in playground context

---

## Full implementation plan

See the complete spec (data model, RLS, file list, verification steps) in the Cursor plan file or ask to execute when ready post-approval.

**Implementation todos (all cancelled until gate clears):**

1. Schema migration + seed
2. Extract shared chat/map components
3. Playground pages + nav
4. Admin playgrounds API/UI
5. Trail cross-links
6. QA presence + realtime

---

## When to start

1. App Store approval received
2. Production iOS + Android stable (sign-in, push, location on runs)
3. Explicit go-ahead to implement this plan
