// Profile API service for communicating with the backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coolscool.onrender.com';

export interface ProfileData {
  id: string;
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
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ProfileResponse {
  success: boolean;
  data: ProfileData;
}

export interface UpdateProfileData {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  grade?: number | null;
  schoolName?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  bio?: string | null;
  parentGuardianName?: string | null;
  parentGuardianPhone?: string | null;
  parentGuardianEmail?: string | null;
  parentGuardianRelationship?: string | null;
  preferredLanguage?: string | null;
  learningStyle?: string | null;
  subjectsOfInterest?: string[] | null;
}

/**
 * Get the current user's profile
 */
export async function getProfile(accessToken: string): Promise<ProfileResponse> {
  const response = await fetch(`${API_URL}/api/v1/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to fetch profile');
  }

  return response.json();
}

/**
 * Update the current user's profile
 */
export async function updateProfile(
  accessToken: string,
  data: UpdateProfileData
): Promise<ProfileResponse> {
  const response = await fetch(`${API_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to update profile');
  }

  return response.json();
}
