'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { ProfileData, UpdateProfileData } from '@/services/profile-api';
import { updateProfile } from '@/services/profile-api';

interface ProfileFormProps {
  profile: ProfileData;
  accessToken: string;
}

const GENDER_OPTIONS = ['', 'Male', 'Female', 'Other', 'Prefer not to say'];
const GRADE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const RELATIONSHIP_OPTIONS = ['', 'Mother', 'Father', 'Guardian', 'Other'];
const LEARNING_STYLE_OPTIONS = ['', 'Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];
const SUBJECT_OPTIONS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
];

export function ProfileForm({ profile, accessToken }: ProfileFormProps) {
  const [formData, setFormData] = useState<UpdateProfileData>({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '',
    phoneNumber: profile.phoneNumber || '',
    grade: profile.grade,
    schoolName: profile.schoolName || '',
    city: profile.city || '',
    state: profile.state || '',
    country: profile.country || '',
    parentGuardianName: profile.parentGuardianName || '',
    parentGuardianPhone: profile.parentGuardianPhone || '',
    parentGuardianEmail: profile.parentGuardianEmail || '',
    parentGuardianRelationship: profile.parentGuardianRelationship || '',
    preferredLanguage: profile.preferredLanguage || '',
    learningStyle: profile.learningStyle || '',
    subjectsOfInterest: profile.subjectsOfInterest || [],
    bio: profile.bio || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Clear messages after a delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'grade' ? (value === '' ? null : Number(value)) : value,
    }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => {
      const current = prev.subjectsOfInterest || [];
      const updated = current.includes(subject)
        ? current.filter((s) => s !== subject)
        : [...current, subject];
      return { ...prev, subjectsOfInterest: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await updateProfile(accessToken, formData);
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update profile'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const bioLength = (formData.bio || '').length;

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      {/* Status Messages */}
      {successMessage && (
        <div className="profile-message profile-message-success">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="profile-message profile-message-error">
          {errorMessage}
        </div>
      )}

      {/* Personal Information */}
      <section className="profile-section">
        <h2 className="profile-section-title">Personal Information</h2>
        <div className="profile-field-grid">
          <div className="profile-field">
            <label className="profile-label" htmlFor="firstName">
              First Name
            </label>
            <input
              className="profile-input"
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName || ''}
              onChange={handleChange}
              placeholder="Enter first name"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="lastName">
              Last Name
            </label>
            <input
              className="profile-input"
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleChange}
              placeholder="Enter last name"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="dateOfBirth">
              Date of Birth
            </label>
            <input
              className="profile-input"
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth || ''}
              onChange={handleChange}
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="gender">
              Gender
            </label>
            <select
              className="profile-input"
              id="gender"
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || 'Select gender'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="profile-section">
        <h2 className="profile-section-title">Contact Information</h2>
        <div className="profile-field-grid">
          <div className="profile-field">
            <label className="profile-label" htmlFor="email">
              Email
            </label>
            <input
              className="profile-input profile-input-disabled"
              type="email"
              id="email"
              value={profile.email}
              disabled
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="phoneNumber">
              Phone Number
            </label>
            <input
              className="profile-input"
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber || ''}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </section>

      {/* Education */}
      <section className="profile-section">
        <h2 className="profile-section-title">Education</h2>
        <div className="profile-field-grid">
          <div className="profile-field">
            <label className="profile-label" htmlFor="grade">
              Grade / Class
            </label>
            <select
              className="profile-input"
              id="grade"
              name="grade"
              value={formData.grade ?? ''}
              onChange={handleChange}
            >
              <option value="">Select grade</option>
              {GRADE_OPTIONS.filter((g) => g > 0).map((g) => (
                <option key={g} value={g}>
                  Class {g}
                </option>
              ))}
            </select>
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="schoolName">
              School Name
            </label>
            <input
              className="profile-input"
              type="text"
              id="schoolName"
              name="schoolName"
              value={formData.schoolName || ''}
              onChange={handleChange}
              placeholder="Enter school name"
            />
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="profile-section">
        <h2 className="profile-section-title">Location</h2>
        <div className="profile-field-grid profile-field-grid-3">
          <div className="profile-field">
            <label className="profile-label" htmlFor="city">
              City
            </label>
            <input
              className="profile-input"
              type="text"
              id="city"
              name="city"
              value={formData.city || ''}
              onChange={handleChange}
              placeholder="Enter city"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="state">
              State
            </label>
            <input
              className="profile-input"
              type="text"
              id="state"
              name="state"
              value={formData.state || ''}
              onChange={handleChange}
              placeholder="Enter state"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="country">
              Country
            </label>
            <input
              className="profile-input"
              type="text"
              id="country"
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              placeholder="Enter country"
            />
          </div>
        </div>
      </section>

      {/* Parent/Guardian */}
      <section className="profile-section">
        <h2 className="profile-section-title">Parent / Guardian</h2>
        <div className="profile-field-grid">
          <div className="profile-field">
            <label className="profile-label" htmlFor="parentGuardianName">
              Guardian Name
            </label>
            <input
              className="profile-input"
              type="text"
              id="parentGuardianName"
              name="parentGuardianName"
              value={formData.parentGuardianName || ''}
              onChange={handleChange}
              placeholder="Enter guardian name"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="parentGuardianPhone">
              Guardian Phone
            </label>
            <input
              className="profile-input"
              type="tel"
              id="parentGuardianPhone"
              name="parentGuardianPhone"
              value={formData.parentGuardianPhone || ''}
              onChange={handleChange}
              placeholder="Enter guardian phone"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="parentGuardianEmail">
              Guardian Email
            </label>
            <input
              className="profile-input"
              type="email"
              id="parentGuardianEmail"
              name="parentGuardianEmail"
              value={formData.parentGuardianEmail || ''}
              onChange={handleChange}
              placeholder="Enter guardian email"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="parentGuardianRelationship">
              Relationship
            </label>
            <select
              className="profile-input"
              id="parentGuardianRelationship"
              name="parentGuardianRelationship"
              value={formData.parentGuardianRelationship || ''}
              onChange={handleChange}
            >
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || 'Select relationship'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Learning Preferences */}
      <section className="profile-section">
        <h2 className="profile-section-title">Learning Preferences</h2>
        <div className="profile-field-grid">
          <div className="profile-field">
            <label className="profile-label" htmlFor="preferredLanguage">
              Preferred Language
            </label>
            <input
              className="profile-input"
              type="text"
              id="preferredLanguage"
              name="preferredLanguage"
              value={formData.preferredLanguage || ''}
              onChange={handleChange}
              placeholder="e.g. English"
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="learningStyle">
              Learning Style
            </label>
            <select
              className="profile-input"
              id="learningStyle"
              name="learningStyle"
              value={formData.learningStyle || ''}
              onChange={handleChange}
            >
              {LEARNING_STYLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || 'Select learning style'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="profile-field" style={{ marginTop: 'var(--spacing-md)' }}>
          <label className="profile-label">Subjects of Interest</label>
          <div className="profile-subjects">
            {SUBJECT_OPTIONS.map((subject) => (
              <button
                key={subject}
                type="button"
                className={`profile-subject-tag ${
                  (formData.subjectsOfInterest || []).includes(subject)
                    ? 'profile-subject-tag-active'
                    : ''
                }`}
                onClick={() => handleSubjectToggle(subject)}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="profile-section">
        <h2 className="profile-section-title">About</h2>
        <div className="profile-field">
          <label className="profile-label" htmlFor="bio">
            Bio
          </label>
          <textarea
            className="profile-input profile-textarea"
            id="bio"
            name="bio"
            value={formData.bio || ''}
            onChange={handleChange}
            placeholder="Tell us a little about yourself..."
            maxLength={500}
            rows={4}
          />
          <div className="profile-char-count">
            {bioLength}/500
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="profile-actions">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSaving}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
