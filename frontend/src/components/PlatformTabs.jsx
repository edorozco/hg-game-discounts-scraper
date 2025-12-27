import React from 'react';
import xboxLogo from '../assets/images/xbox-logo.png';
import playstationLogo from '../assets/images/playstation-logotype.png';
import './PlatformTabs.css';

function PlatformTabs({ activePlatform, onPlatformChange }) {
  return (
    <div className="platform-tabs-container">
      <button
        className={`platform-tab ${activePlatform === 'xbox' ? 'active' : ''}`}
        onClick={() => onPlatformChange('xbox')}
      >
        <img src={xboxLogo} alt="Xbox" className="platform-icon" />
        Xbox
      </button>
      <button
        className={`platform-tab ${activePlatform === 'playstation' ? 'active' : ''}`}
        onClick={() => onPlatformChange('playstation')}
      >
        <img src={playstationLogo} alt="PlayStation" className="platform-icon" />
        PlayStation
      </button>
    </div>
  );
}

export default PlatformTabs;

