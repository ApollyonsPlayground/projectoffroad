export const DEV_UPDATES_VERSION = '2026-05-29';

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
    date: 'May 29, 2026',
    title: 'Trail identity, club photos & community tools',
    items: [
      {
        tag: 'new',
        title: 'Club photo upload',
        summary:
          'Club owners can upload a logo or profile photo from their phone on the club edit screen — no URL required.',
      },
      {
        tag: 'new',
        title: 'Auto trail names (@username)',
        summary:
          'Every rider gets a unique @handle on sign-in. The feed, runs, clubs, and messages show nicknames only — real names stay private.',
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
