import { INTERESTS } from '../interests';

// The list is repeated so the loop has no visible seam.
const ITEMS = Array.from({ length: 6 }, () => INTERESTS).flat();

const Ticker = () => (
  <div className="ticker label" aria-hidden="true">
    <div>
      {ITEMS.map(({ name }, i) => (
        <span key={i}>{name}</span>
      ))}
    </div>
  </div>
);

export default Ticker;
