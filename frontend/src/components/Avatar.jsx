import { fileUrl } from '../services/api';

// A square portrait, or the first letter of the name when there is no picture.
const Avatar = ({ user, size = 40 }) => (
  <span className="avatar" style={{ '--size': `${size}px` }}>
    {user?.profile_picture ? (
      <img src={fileUrl(user.profile_picture)} alt="" />
    ) : (
      (user?.username?.[0] || '?').toUpperCase()
    )}
  </span>
);

export default Avatar;
