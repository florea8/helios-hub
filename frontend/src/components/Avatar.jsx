import { useState } from 'react';
import { fileUrl } from '../services/api';

// A square portrait, or the first letter of the name when there is no picture or it fails to load.
const Avatar = ({ user, size = 40 }) => {
  const picture = user?.profile_picture;
  const [broken, setBroken] = useState(null); // the picture that failed, so a new one gets a fresh try

  return (
    <span className="avatar" style={{ '--size': `${size}px` }}>
      {picture && broken !== picture ? (
        <img src={fileUrl(picture)} alt="" onError={() => setBroken(picture)} />
      ) : (
        (user?.username?.[0] || '?').toUpperCase()
      )}
    </span>
  );
};

export default Avatar;
