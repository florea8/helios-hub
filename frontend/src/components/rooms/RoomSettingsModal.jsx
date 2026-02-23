import React from 'react';

export default function RoomSettingsModal({
  isOpen,
  onClose,
  roomSettings,
  setRoomSettings,
  onSubmit,
  savingSettings
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Room Settings</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <form onSubmit={onSubmit} className="modal-form">
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={roomSettings.description || ''}
              onChange={(e) => setRoomSettings({ ...roomSettings, description: e.target.value })}
              placeholder="Extended description for the room..."
              className="form-input"
              rows="4"
            />
          </div>
          <div className="form-group">
            <label>Rules</label>
            <textarea
              value={roomSettings.rules || ''}
              onChange={(e) => setRoomSettings({ ...roomSettings, rules: e.target.value })}
              placeholder="Room rules and guidelines..."
              className="form-input"
              rows="6"
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-submit" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
