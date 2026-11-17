import { useEffect, useRef } from 'react';

// A modal built on the native <dialog>, which handles Escape and focus itself.
const Dialog = ({ open, title, onClose, children }) => {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog paper"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div>
          <header>
            <h2>{title}</h2>
            <button type="button" aria-label="Close" onClick={onClose}>
              &times;
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
};

export default Dialog;
