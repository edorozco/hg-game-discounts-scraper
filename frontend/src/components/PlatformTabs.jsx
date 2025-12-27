import React from 'react';
import './PlatformTabs.css';

function PlatformTabs({ activePlatform, onPlatformChange }) {
  return (
    <div className="platform-tabs-container">
      <button
        className={`platform-tab ${activePlatform === 'xbox' ? 'active' : ''}`}
        onClick={() => onPlatformChange('xbox')}
      >
        <span className="platform-icon">🎮</span>
        Xbox
      </button>
      <button
        className={`platform-tab ${activePlatform === 'playstation' ? 'active' : ''}`}
        onClick={() => onPlatformChange('playstation')}
      >
        <span className="platform-icon">🎯</span>
        PlayStation
      </button>
    </div>
  );
}

export default PlatformTabs;

