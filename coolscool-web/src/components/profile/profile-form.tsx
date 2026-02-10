'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { ProfileData, UpdateProfileData } from '@/services/profile-api';
import { updateProfile } from '@/services/profile-api';

interface ProfileFormProps {
  profile: ProfileData;
  accessToken: string;
}

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Select relationship' },
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

const LEARNING_STYLE_OPTIONS = [
  { value: '', label: 'Select learning style' },
  { value: 'visual', label: 'Visual' },
  { value: 'auditory', label: 'Auditory' },
  { value: 'reading', label: 'Reading/Writing' },
  { value: 'kinesthetic', label: 'Kinesthetic' },
];

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

// Fields that count toward profile completion
const COMPLETION_FIELDS: { key: keyof UpdateProfileData; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'grade', label: 'Grade' },
  { key: 'schoolName', label: 'School Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'parentGuardianName', label: 'Guardian Name' },
  { key: 'parentGuardianPhone', label: 'Guardian Phone' },
  { key: 'parentGuardianEmail', label: 'Guardian Email' },
  { key: 'parentGuardianRelationship', label: 'Relationship' },
  { key: 'preferredLanguage', label: 'Preferred Language' },
  { key: 'learningStyle', label: 'Learning Style' },
  { key: 'bio', label: 'Bio' },
];

// Required fields
const REQUIRED_FIELDS = new Set<keyof UpdateProfileData>([
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'grade',
  'parentGuardianName',
  'parentGuardianEmail',
]);

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function ProfileCompletionCircle({ percentage }: { percentage: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const color = percentage === 100 ? 'var(--color-correct)' : percentage >= 60 ? 'var(--color-primary)' : 'var(--color-text-muted)';

  return (
    <div className="profile-completion">
      <div className="profile-completion-circle">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 48 48)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <span className="profile-completion-text" style={{ color }}>
          {percentage}%
        </span>
      </div>
      <p className="profile-completion-label">
        {percentage === 100 ? 'Profile complete!' : 'Profile completion'}
      </p>
    </div>
  );
}

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
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  // Compute completion percentage
  const completionPercentage = useMemo(() => {
    const filled = COMPLETION_FIELDS.filter(f => isFilled(formData[f.key])).length;
    return Math.round((filled / COMPLETION_FIELDS.length) * 100);
  }, [formData]);

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
    // Clear validation error for this field on change
    if (validationErrors.has(name)) {
      setValidationErrors(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
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

  const validate = (): boolean => {
    const errors = new Set<string>();
    for (const field of REQUIRED_FIELDS) {
      if (!isFilled(formData[field])) {
        errors.add(field as string);
      }
    }
    setValidationErrors(errors);
    return errors.size === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!validate()) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      // Clean empty strings to null for optional fields before sending
      const cleanData = { ...formData };
      if (cleanData.dateOfBirth === '') cleanData.dateOfBirth = null;
      if (cleanData.gender === '') cleanData.gender = null;
      if (cleanData.parentGuardianRelationship === '') cleanData.parentGuardianRelationship = null;
      if (cleanData.learningStyle === '') cleanData.learningStyle = null;

      await updateProfile(accessToken, cleanData);
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
  const isRequired = (field: string) => REQUIRED_FIELDS.has(field as keyof UpdateProfileData);
  const hasError = (field: string) => validationErrors.has(field);

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      {/* Profile Completion */}
      <ProfileCompletionCircle percentage={completionPercentage} />

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
              First Name {isRequired('firstName') && <span className="profile-required">*</span>}
            </label>
            <input
              className={`profile-input ${hasError('firstName') ? 'profile-input-error' : ''}`}
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
              Last Name {isRequired('lastName') && <span className="profile-required">*</span>}
            </label>
            <input
              className={`profile-input ${hasError('lastName') ? 'profile-input-error' : ''}`}
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
              Date of Birth {isRequired('dateOfBirth') && <span className="profile-required">*</span>}
            </label>
            <input
              className={`profile-input ${hasError('dateOfBirth') ? 'profile-input-error' : ''}`}
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth || ''}
              onChange={handleChange}
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="gender">
              Gender {isRequired('gender') && <span className="profile-required">*</span>}
            </label>
            <select
              className={`profile-input ${hasError('gender') ? 'profile-input-error' : ''}`}
              id="gender"
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
              Grade / Class {isRequired('grade') && <span className="profile-required">*</span>}
            </label>
            <select
              className={`profile-input ${hasError('grade') ? 'profile-input-error' : ''}`}
              id="grade"
              name="grade"
              value={formData.grade ?? ''}
              onChange={handleChange}
            >
              <option value="">Select grade</option>
              {GRADE_OPTIONS.map((g) => (
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
              Guardian Name {isRequired('parentGuardianName') && <span className="profile-required">*</span>}
            </label>
            <input
              className={`profile-input ${hasError('parentGuardianName') ? 'profile-input-error' : ''}`}
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
              Guardian Email {isRequired('parentGuardianEmail') && <span className="profile-required">*</span>}
            </label>
            <input
              className={`profile-input ${hasError('parentGuardianEmail') ? 'profile-input-error' : ''}`}
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
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
