'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';

export interface SoundToggleProps {
  enabled?: boolean;
  onChange?: (enabled: boolean) => void;
}

export function SoundToggle({ enabled = true, onChange }: SoundToggleProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);

  useEffect(() => {
    setIsEnabled(enabled);
  }, [enabled]);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="sound-toggle">
      <div className="sound-toggle-info">
        <div className="sound-toggle-label">Sound Effects</div>
        <div className="sound-toggle-description">
          Play sounds for correct/incorrect answers
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        className={`toggle-switch ${isEnabled ? 'enabled' : ''}`}
        onClick={handleToggle}
      >
        <span className="toggle-switch-thumb" />
        <span className="sr-only">{isEnabled ? 'Disable' : 'Enable'} sound effects</span>
      </button>
    </div>
  );
}

export default SoundToggle;
