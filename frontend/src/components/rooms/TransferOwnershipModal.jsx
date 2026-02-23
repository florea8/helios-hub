import React from 'react';

export default function TransferOwnershipModal({
  isOpen,
  onClose,
  selectedTransferUserId,
  setSelectedTransferUserId,
  members,
  currentUserId,
  onSubmit
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Transfer Ownership</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <form onSubmit={onSubmit} className="modal-form">
          <div className="form-group">
            <label>Select New Owner</label>
            <select
              value={selectedTransferUserId}
              onChange={(e) => setSelectedTransferUserId(e.target.value)}
              className="form-input"
              required
            >
              <option value="">Choose a member...</option>
              {members.filter((m) => m.id !== currentUserId).map((member) => (
                <option key={member.id} value={member.id}>{member.username}</option>
              ))}
            </select>
          </div>
          <p className="warning-text">Warning: You will become a moderator after transferring ownership. This action cannot be undone.</p>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-submit btn-danger">Transfer Ownership</button>
          </div>
        </form>
      </div>
    </div>
  );
}
