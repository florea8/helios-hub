import { tagStyle } from '../interests';

const InterestTag = ({ interest }) => (
  <span className="tag" style={tagStyle(interest)}>
    {interest.name}
  </span>
);

export default InterestTag;
