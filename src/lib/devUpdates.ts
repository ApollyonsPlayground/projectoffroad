export const DEV_UPDATES_VERSION = '2026-06-01';

export type DevUpdateTag = 'new' | 'improved' | 'fix';

export type DevUpdateItem = {
  title: string;
  summary: string;
  tag: DevUpdateTag;
};

export type DevUpdateCallout = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type DevUpdateRelease = {
  version: string;
  date: string;
  title: string;
  items: DevUpdateItem[];
  /** Optional banner — e.g. ask for feedback before enabling a feature. */
  callout?: DevUpdateCallout;
};

export const DEV_UPDATES: DevUpdateRelease[] = [
  {
    version: DEV_UPDATES_VERSION,
    date: 'May 31, 2026',
    title: 'Still building — vote, clubs & push on the way',
    callout: {
      title: 'We’re still actively building',
      body:
        'SoCal Offroaders is under active development — new features land regularly. Push notifications are being wired up (nothing sent yet). Which alerts would feel helpful vs. annoying? Run reminders (72h / 48h / 24h), new runs near you, club updates, DMs, community vote open / winner, or safety on active runs. Reply via support or club chat.',
      ctaLabel: 'Contact support',
      ctaHref: '/support/',
    },
    items: [
      {
        tag: 'new',
        title: 'Community trail vote — opens soon',
        summary:
          'A 14-day blind vote for our next big group run is coming to the top of the feed — Lytle Creek or Cleghorn, day or night. Vote opens soon; you’ll get one vote and the winner is revealed when the timer ends.',
      },
      {
        tag: 'new',
        title: 'Club cover photo',
        summary:
          'Club owners can set a full-width background on the club page and directory cards. Tap Add cover photo on your club page or upload from Edit club info.',
      },
      {
        tag: 'new',
        title: 'Club logo upload',
        summary:
          'Upload a club logo from your phone — camera button on the club page or file picker under Edit club info.',
      },
      {
        tag: 'new',
        title: 'Auto nicknames (@username)',
        summary:
          'Every rider gets a unique @handle on sign-in. The feed, runs, clubs, and messages show nicknames only — real names stay private on public surfaces.',
      },
      {
        tag: 'improved',
        title: 'Push setup (no messages yet)',
        summary:
          'The native app can register your device for future push alerts when you’re signed in. Delivery is still off — you won’t get push notifications until we finish setup and turn sending on.',
      },
      {
        tag: 'improved',
        title: 'Signed-in app entry',
        summary:
          'Returning users skip the marketing homepage and off-road advisory gate — you land in the feed automatically.',
      },
      {
        tag: 'new',
        title: 'Trail condition reports',
        summary:
          'Submit structured trail reports from trail pages or completed runs. Reports can include photos and post to the feed.',
      },
      {
        tag: 'fix',
        title: 'Repost visibility',
        summary:
          'Reposts now appear in your feed only when you follow the person who reposted (plus your own reposts).',
      },
    ],
  },
  {
    version: '2026-05-29',
    date: 'May 29, 2026',
    title: 'Club branding, trail names & smoother entry',
    items: [
      {
        tag: 'new',
        title: "What's new",
        summary:
          'Open Menu → What\'s new anytime for release notes. This popup highlights major changes after each update.',
      },
      {
        tag: 'new',
        title: 'Followers & following lists',
        summary: 'Tap follower/following counts on profiles to browse who you follow and who follows you.',
      },
      {
        tag: 'improved',
        title: 'Nickname welcome',
        summary:
          'After your @handle is assigned, a short toast explains your trail name and points you to Edit profile if you want to change it.',
      },
      {
        tag: 'improved',
        title: 'Run lifecycle',
        summary:
          'Runs auto-start at their scheduled time and auto-complete after 24 hours. Hosts can still start a run early.',
      },
    ],
  },
];

export function devUpdatesStorageKey(version = DEV_UPDATES_VERSION): string {
  return `dev_updates_seen_${version.replace(/-/g, '_')}`;
}

export function latestDevRelease(): DevUpdateRelease {
  return DEV_UPDATES[0];
}
