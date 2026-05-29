export const DEV_UPDATES_VERSION = '2026-05-30';

export type DevUpdateTag = 'new' | 'improved' | 'fix';

export type DevUpdateItem = {
  title: string;
  summary: string;
  tag: DevUpdateTag;
};

export type DevUpdateRelease = {
  version: string;
  date: string;
  title: string;
  items: DevUpdateItem[];
};

export const DEV_UPDATES: DevUpdateRelease[] = [
  {
    version: DEV_UPDATES_VERSION,
    date: 'May 30, 2026',
    title: 'Club branding, trail names & smoother entry',
    items: [
      {
        tag: 'new',
        title: 'Club cover photo',
        summary:
          'Club owners can set a full-width background cover on the club page (and on directory cards). Tap Add cover photo on your club page or upload from Edit club info.',
      },
      {
        tag: 'new',
        title: 'Club logo upload',
        summary:
          'Club owners can upload a logo from their phone — use the camera button on the club page or the file picker under Edit club info.',
      },
      {
        tag: 'new',
        title: 'Auto nicknames (@username)',
        summary:
          'Every rider gets a unique @handle on sign-in. The feed, runs, clubs, and messages show nicknames only — real names stay private on public surfaces.',
      },
      {
        tag: 'new',
        title: "What's new",
        summary:
          'Open Menu → What\'s new anytime for release notes. A one-time popup highlights the latest changes after you update.',
      },
      {
        tag: 'new',
        title: 'Trail condition reports',
        summary:
          'Submit structured trail reports from trail pages or completed runs. Reports can include photos and always post to the feed.',
      },
      {
        tag: 'new',
        title: 'Followers & following lists',
        summary: 'Tap follower/following counts on profiles to browse who you follow and who follows you.',
      },
      {
        tag: 'improved',
        title: 'Signed-in app entry',
        summary:
          'Returning users skip the marketing homepage and off-road advisory gate — you land in the feed automatically.',
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
      {
        tag: 'fix',
        title: 'Repost visibility',
        summary: 'Reposts now appear in your feed only when you follow the person who reposted (plus your own reposts).',
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
