import { query } from '../db/index.js';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  grade: number | null;
  schoolName: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bio: string | null;
  parentGuardianName: string | null;
  parentGuardianPhone: string | null;
  parentGuardianEmail: string | null;
  parentGuardianRelationship: string | null;
  preferredLanguage: string | null;
  learningStyle: string | null;
  subjectsOfInterest: string[] | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  grade?: number;
  school_name?: string;
  city?: string;
  state?: string;
  country?: string;
  bio?: string;
  parent_guardian_name?: string;
  parent_guardian_phone?: string;
  parent_guardian_email?: string;
  parent_guardian_relationship?: string;
  preferred_language?: string;
  learning_style?: string;
  subjects_of_interest?: string[];
}

// Get full user profile (user + profile data)
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const result = await query(
    `SELECT u.id, u.email, u.display_name, u.avatar_url, u.role, u.created_at, u.last_login_at,
            p.first_name, p.last_name, p.phone_number, p.date_of_birth, p.gender,
            p.grade, p.school_name, p.city, p.state, p.country, p.bio,
            p.parent_guardian_name, p.parent_guardian_phone, p.parent_guardian_email,
            p.parent_guardian_relationship, p.preferred_language, p.learning_style,
            p.subjects_of_interest
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1 AND u.is_active = true`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    userId: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    grade: row.grade,
    schoolName: row.school_name,
    city: row.city,
    state: row.state,
    country: row.country,
    bio: row.bio,
    parentGuardianName: row.parent_guardian_name,
    parentGuardianPhone: row.parent_guardian_phone,
    parentGuardianEmail: row.parent_guardian_email,
    parentGuardianRelationship: row.parent_guardian_relationship,
    preferredLanguage: row.preferred_language,
    learningStyle: row.learning_style,
    subjectsOfInterest: row.subjects_of_interest,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

// Update user profile (only provided fields)
export async function updateProfile(
  userId: string,
  fields: UpdateProfileInput
): Promise<UserProfile | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldEntries = Object.entries(fields) as [keyof UpdateProfileInput, unknown][];

  for (const [key, value] of fieldEntries) {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (updates.length === 0) return getProfile(userId);

  values.push(userId);
  await query(
    `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
    values
  );

  return getProfile(userId);
}

// Upsert profile from Google OAuth data (preserves manually-edited names)
export async function upsertProfile(
  userId: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  await query(
    `INSERT INTO user_profiles (user_id, first_name, last_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = COALESCE(user_profiles.first_name, EXCLUDED.first_name),
       last_name = COALESCE(user_profiles.last_name, EXCLUDED.last_name),
       updated_at = NOW()`,
    [userId, firstName || null, lastName || null]
  );
}
