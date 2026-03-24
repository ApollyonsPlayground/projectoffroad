// LEGACY: Supabase integration DISABLED for v3 deployment
// Reason: Submissions and community runs are now handled via external Luma service.
// Do NOT rely on these functions in production builds. They are kept for reference only.

export const LEGACY_SUPABASE_DISABLED = true;

export type Difficulty = 'Beginner' | 'Moderate' | 'Advanced' | 'Extreme';
export type TrailStatus = 'Open' | 'Closed' | 'Seasonal';
export type SubmissionType = 'run' | 'trail';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Trail {
  id: string;
  title: string;
  location: string;
  difficulty: Difficulty;
  difficulty_level: string;
  rig_requirements: string;
  onx_slug: string;
  coordinates: string;
  status: TrailStatus;
  image_url: string;
  distance: string;
  time_estimate: string;
  description: string;
  terrain: string;
  created_at?: string;
}

export interface Run {
  id: string;
  title: string;
  date: string;
  meetup_location: string;
  description: string;
  difficulty: Difficulty;
  max_rigs: number;
  rigs_joined: number;
  trail_id: string;
  is_verified: boolean;
  organizer_name: string;
  organizer_instagram: string;
  created_at?: string;
}

export interface Submission {
  id: string;
  type: SubmissionType;
  content_payload: Record<string, any>;
  user_contact?: string;
  status: SubmissionStatus;
  created_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

// All helper functions intentionally throw. Use static data in src/data or the Luma integration.
function disabled() {
  throw new Error('Supabase integration disabled for this branch. Use static data (src/data/trails.json) or the Luma RSVP/submission flow.');
}

export async function getTrails(): Promise<Trail[]> { disabled(); return [] as Trail[]; }
export async function getRuns(): Promise<Run[]> { disabled(); return [] as Run[]; }
export async function createSubmission(_submission: Omit<Submission, 'id' | 'created_at'>) { disabled(); return null; }
