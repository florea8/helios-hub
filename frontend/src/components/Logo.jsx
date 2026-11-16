import { Link } from 'react-router-dom';

// The wordmark: a flat sun and the name, linking home.
const Logo = () => (
  <Link to="/" className="logo-mark">
    <i aria-hidden="true" />
    Helios
  </Link>
);

export default Logo;
