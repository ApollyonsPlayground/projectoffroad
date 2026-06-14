# Version bump — action required (Noah)

**Current store versions (do not change yet):** `1.3` / build **16**  
**Next native release (queued):** `2.0` / build **17**

Play and TestFlight stay at **1.3 (16)** until the next deliberate upload. When you ship that update, edit `app-version.json` (remove `nextRelease`, set top-level fields to 2.0 / 17), then `npm run version:sync`.

## Version lockstep (Android ↔ iOS)

| Field | Android | iOS (Mac `ios:sync-version`) |
|-------|---------|------------------------------|
| User-visible | `versionName` **1.3** | MARKETING_VERSION **1.3** |
| Store build integer | `versionCode` **16** | CURRENT_PROJECT_VERSION **16** |

## Next release (when ready)

| Field | Target |
|-------|--------|
| `versionName` | **2.0** |
| `androidVersionCode` / `iosBuildNumber` | **17** |
| `packageJsonVersion` | **2.0.0** |

Update `src/lib/devUpdates.ts` with the 2.0 What's New entry at ship time.

## Remotes

| Remote | Role |
|--------|------|
| **gitlab** | Vercel deploy source of truth |
| **origin** (GitHub) | Mirror of `main` |

Delete or archive this file after **2.0 (17)** is live on both stores.
