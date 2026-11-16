const InterestTag = ({ interest }) => (
  <span className="tag" style={{ '--c': interest.color, '--p': interest.shape }}>
    {interest.name}
  </span>
);

export default InterestTag;
