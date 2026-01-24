import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Settings.css';

const Settings = () => {
  return (
    <div className="settings-page">
      <header className="app-header">
        <div className="logo">
          <Link to="/">Helios</Link>
        </div>
      </header>

      <div className="settings-content">
        <h1>Settings</h1>
        <p>Settings page coming soon.</p>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
};

export default Settings;