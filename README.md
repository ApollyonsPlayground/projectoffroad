# SoCal Offroaders - Community App

Full-featured offroad community platform for Southern California.

## Features

- **User Accounts** - Registration, profiles, vehicle management
- **Clubs** - Create and join offroad clubs with verification
- **Runs** - Create and join offroad runs with RSVP
- **Real-time Chat** - Run chat with live messaging
- **PWA** - Installable as native app

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Auth, Database, Realtime)
- Tailwind CSS
- TypeScript
- Capacitor (Android build)

## Getting Started

1. **Set up Supabase:**
   - Create a new Supabase project
   - Run `src/lib/db/schema.sql` in the SQL Editor
   - Get your URL and anon key

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open:** http://localhost:3000

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # API routes
│   ├── login/        # Login page
│   ├── register/     # Registration page
│   ├── dashboard/    # Main dashboard
│   ├── profile/      # User profile
│   ├── runs/         # Runs listing
│   └── clubs/        # Clubs listing
├── components/       # React components
├── context/          # React contexts (Auth)
└── lib/              # Utilities & database
```

## Deployment

Build for production:
```bash
npm run build
```

Deploy to Vercel or any Next.js hosting.

## PWA

The app is configured as a PWA. Visit in Chrome on Android and select "Add to Home Screen" for an app-like experience.
