export const TRAIL_REPORT_CONDITION_OPTIONS = [
  { id: 'open', label: 'Open' },
  { id: 'limited', label: 'Limited access' },
  { id: 'closed', label: 'Closed' },
  { id: 'unknown', label: 'Unknown' },
] as const;

export const TRAIL_REPORT_DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Easy today' },
  { id: 'moderate', label: 'Moderate today' },
  { id: 'hard', label: 'Hard today' },
  { id: 'extreme', label: 'Extreme today' },
  { id: 'unknown', label: 'Not sure' },
] as const;

export const TRAIL_REPORT_SURFACE_OPTIONS = [
  'dry',
  'dusty',
  'mud',
  'snow',
  'ice',
  'washouts',
  'water crossings',
  'loose rocks',
  'deep ruts',
] as const;

export const TRAIL_REPORT_HAZARD_OPTIONS = [
  'closures',
  'downed trees',
  'rock slides',
  'deep water',
  'erosion',
  'tight brush',
  'traffic',
  'recovery needed',
] as const;

export type TrailReportCondition = (typeof TRAIL_REPORT_CONDITION_OPTIONS)[number]['id'];
export type TrailReportDifficulty = (typeof TRAIL_REPORT_DIFFICULTY_OPTIONS)[number]['id'];

export type TrailReportPayload = {
  trail_id: string;
  trail_name?: string | null;
  run_id?: string | null;
  condition_status: TrailReportCondition;
  difficulty_today: TrailReportDifficulty;
  surface_conditions: string[];
  hazards: string[];
  hazards_note?: string | null;
  weather?: string | null;
  body: string;
  photo_urls: string[];
};

export type TrailReportRow = TrailReportPayload & {
  id: string;
  user_id: string;
  feed_post_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  users?: {
    name?: string | null;
    username?: string | null;
    hide_display_name?: boolean | null;
    avatar_url?: string | null;
    is_verified?: boolean | null;
  } | null;
  runs?: {
    title?: string | null;
    date?: string | null;
  } | null;
};

function labelFor<T extends readonly { id: string; label: string }[]>(
  options: T,
  value: string | null | undefined,
  fallback: string
): string {
  return options.find((option) => option.id === value)?.label ?? fallback;
}

export function trailReportConditionLabel(value: string | null | undefined): string {
  return labelFor(TRAIL_REPORT_CONDITION_OPTIONS, value, 'Unknown');
}

export function trailReportDifficultyLabel(value: string | null | undefined): string {
  return labelFor(TRAIL_REPORT_DIFFICULTY_OPTIONS, value, 'Not sure');
}

export function normalizeTrailReportTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

export function normalizeTrailReportPhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 6);
}

export function buildTrailReportFeedBody(input: {
  trailName: string;
  condition_status: string;
  difficulty_today: string;
  surface_conditions?: string[];
  hazards?: string[];
  hazards_note?: string | null;
  weather?: string | null;
  body: string;
}): string {
  const parts = [
    `Trail report for ${input.trailName}: ${trailReportConditionLabel(input.condition_status)}.`,
    `Difficulty: ${trailReportDifficultyLabel(input.difficulty_today)}.`,
  ];
  if (input.surface_conditions?.length) {
    parts.push(`Conditions: ${input.surface_conditions.join(', ')}.`);
  }
  if (input.hazards?.length) {
    parts.push(`Hazards: ${input.hazards.join(', ')}.`);
  }
  if (input.hazards_note?.trim()) {
    parts.push(`Heads up: ${input.hazards_note.trim()}`);
  }
  if (input.weather?.trim()) {
    parts.push(`Weather: ${input.weather.trim()}.`);
  }
  parts.push(input.body.trim());
  return parts.join('\n\n');
}
