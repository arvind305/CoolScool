'use client';

import * as React from 'react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/queries/use-parent-queries';

export interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [localPrefs, setLocalPrefs] = React.useState(prefs);
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    if (prefs) {
      setLocalPrefs(prefs);
      setHasChanges(false);
    }
  }, [prefs]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!localPrefs) return;
    await updateMutation.mutateAsync(localPrefs);
    setHasChanges(false);
    onClose();
  };

  const updateLocal = (updates: Partial<typeof localPrefs>) => {
    if (!localPrefs) return;
    setLocalPrefs({ ...localPrefs, ...updates });
    setHasChanges(true);
  };

  return (
    <div className="notification-settings-overlay" onClick={onClose}>
      <div className="notification-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notification-settings-header">
          <h2 className="notification-settings-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            Notification Settings
          </h2>
          <button className="notification-settings-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isLoading || !localPrefs ? (
          <div className="notification-settings-loading">Loading preferences...</div>
        ) : (
          <div className="notification-settings-body">
            {/* Email Digest */}
            <div className="notification-setting-group">
              <label className="notification-setting-label">Email Summary Digest</label>
              <p className="notification-setting-description">
                How often would you like to receive a summary of your children&apos;s progress?
              </p>
              <div className="notification-setting-radios">
                {(['daily', 'weekly', 'off'] as const).map((option) => (
                  <label key={option} className="notification-radio">
                    <input
                      type="radio"
                      name="emailDigest"
                      value={option}
                      checked={localPrefs.emailDigest === option}
                      onChange={() => updateLocal({ emailDigest: option })}
                    />
                    <span className="notification-radio-label">
                      {option === 'off' ? 'Off' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Low Accuracy Alerts */}
            <div className="notification-setting-group">
              <div className="notification-setting-toggle-row">
                <div>
                  <label className="notification-setting-label">Low Accuracy Alerts</label>
                  <p className="notification-setting-description">
                    Get notified when a child&apos;s accuracy drops below acceptable levels
                  </p>
                </div>
                <button
                  className={`notification-toggle ${localPrefs.lowAccuracyAlerts ? 'toggle-on' : 'toggle-off'}`}
                  onClick={() => updateLocal({ lowAccuracyAlerts: !localPrefs.lowAccuracyAlerts })}
                  role="switch"
                  aria-checked={localPrefs.lowAccuracyAlerts}
                >
                  <span className="notification-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* Inactivity Alerts */}
            <div className="notification-setting-group">
              <div className="notification-setting-toggle-row">
                <div>
                  <label className="notification-setting-label">Inactivity Alerts</label>
                  <p className="notification-setting-description">
                    Get notified when a child hasn&apos;t practiced for a while
                  </p>
                </div>
                <button
                  className={`notification-toggle ${localPrefs.inactivityAlerts ? 'toggle-on' : 'toggle-off'}`}
                  onClick={() => updateLocal({ inactivityAlerts: !localPrefs.inactivityAlerts })}
                  role="switch"
                  aria-checked={localPrefs.inactivityAlerts}
                >
                  <span className="notification-toggle-thumb" />
                </button>
              </div>
              {localPrefs.inactivityAlerts && (
                <div className="notification-setting-sub">
                  <label className="notification-setting-sublabel">
                    Alert after
                    <select
                      value={localPrefs.inactivityThresholdDays}
                      onChange={(e) => updateLocal({ inactivityThresholdDays: Number(e.target.value) })}
                      className="notification-threshold-select"
                    >
                      {[1, 2, 3, 5, 7].map((d) => (
                        <option key={d} value={d}>
                          {d} {d === 1 ? 'day' : 'days'}
                        </option>
                      ))}
                    </select>
                    of inactivity
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="notification-settings-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
