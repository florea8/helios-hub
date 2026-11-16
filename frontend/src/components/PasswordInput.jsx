import { useState } from 'react';

const PasswordInput = (props) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field-control">
      <input {...props} className="field-input" type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="field-action"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
};

export default PasswordInput;
