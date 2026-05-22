export type RunSource = 'club_official' | 'user_submitted' | null | undefined;

export function isClubOrganizedRun(runSource: RunSource): boolean {
  return runSource === 'club_official';
}

/** Card/list link prefix before the host name. */
export function runHostListLabel(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? 'Organizer' : 'Posted by';
}

/** Detail page profile block heading. */
export function runHostProfileHeading(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? 'Organizer profile' : 'Poster profile';
}

export function runHostProfileLinkText(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? 'View organizer profile' : 'View poster profile';
}

export function runHostFallbackName(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? 'Organizer' : 'Member';
}

/** Host badge on run cards when viewer is the host. */
export function runHostSelfBadge(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? "You're hosting" : 'You posted this';
}

export function runHostSelfToast(runSource: RunSource): string {
  return isClubOrganizedRun(runSource)
    ? "You're hosting this run — no need to join"
    : "You posted this run — no need to join";
}

/** Host badge on run detail when viewer is the host. */
export function runHostSelfDetailBadge(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? "You're the host" : 'You posted this';
}

export function runHostControlsHeading(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? 'Host controls' : 'Your listing';
}

/** Accountability section title on run detail. */
export function runAccountabilityHeading(runSource: RunSource): string {
  return isClubOrganizedRun(runSource) ? 'Hosting & accountability' : 'Posted by & accountability';
}
