import { useState } from 'react';
import { tagStyle } from '../interests';

// Toggle chips for choosing up to `max` interests. With onCreate, a field adds new ones.
const TagPicker = ({ tags, selected, onChange, max, label = 'Interests', onCreate = null }) => {
  const [draft, setDraft] = useState('');

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]);

  const create = async () => {
    if (!draft.trim()) return;
    const tag = await onCreate(draft);
    if (tag && !selected.includes(tag.id) && selected.length < max) onChange([...selected, tag.id]);
    setDraft('');
  };

  return (
    <div className="tag-picker">
      <span className="label">
        {label} · {selected.length}/{max}
      </span>
      <div className="picks">
        {tags.map((tag) => {
          const picked = selected.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              className="tag"
              style={tagStyle(tag)}
              aria-pressed={picked}
              disabled={!picked && selected.length >= max}
              onClick={() => toggle(tag.id)}
            >
              {tag.name}
            </button>
          );
        })}
        {onCreate && (
          <span className="tag-new">
            <input
              className="field-input"
              aria-label="New interest"
              placeholder="+ New interest"
              value={draft}
              maxLength={30}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter here adds the interest instead of submitting the surrounding form.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  create();
                }
              }}
            />
            {draft.trim() && (
              <button type="button" className="link" onClick={create}>
                Add
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default TagPicker;
