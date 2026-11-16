// Striped placeholder rows shown while content loads.
const LoadingSkeleton = ({ count = 3 }) => (
  <div className="skeleton" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => (
      <i key={i} />
    ))}
  </div>
);

export default LoadingSkeleton;
