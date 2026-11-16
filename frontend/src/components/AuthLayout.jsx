import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import '../styles/Auth.css';

// Each interest has its own colour and shape, here and in the feed.
const INTERESTS = [
  { name: 'Electronics', color: '#2fd39a', shape: 'polygon(50% 0, 100% 100%, 0 100%)' },
  { name: 'Photography', color: '#ffd60a', shape: 'circle(50%)' },
  { name: 'Chess', color: '#ff8a7d', shape: 'inset(0)' },
  { name: 'Open source', color: '#9db0ff', shape: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' },
  { name: 'Music production', color: '#ffb3e6', shape: 'polygon(0 0, 100% 0, 50% 100%)' },
];

// right, bottom, size, colour, rotation, corner radius
const SHAPES = [
  [40, 30, 150, 'var(--yellow)', 0, '50%'],
  [170, 20, 96, 'var(--tomato)', 12, 0],
  [250, 96, 70, 'var(--mint)', 45, 0],
  [10, 150, 60, 'var(--blue)', -8, '50% 50% 0 0'],
];

const AuthLayout = ({ label, title, subtitle, children, footer }) => (
  <div className="auth paper">
    <aside className="auth-board">
      <Logo />
      <h1>
        Find your <span className="marker">people.</span> <em>Build</em> something together.
      </h1>
      <p>
        Helios gathers people around the things they care about, so they can talk it through,
        solve problems and start projects.
      </p>
      <div className="auth-tags">
        {INTERESTS.map(({ name, color, shape }) => (
          <span key={name} className="tag" style={{ '--c': color, '--p': shape }}>
            {name}
          </span>
        ))}
      </div>
      <div className="auth-shapes" aria-hidden="true">
        {SHAPES.map(([x, y, size, color, rotation, radius], i) => (
          <i
            key={i}
            style={{
              '--x': `${x}px`,
              '--y': `${y}px`,
              '--s': `${size}px`,
              '--c': color,
              '--r': `${rotation}deg`,
              '--i': i,
              borderRadius: radius,
            }}
          />
        ))}
      </div>
      <div className="auth-ticker label" aria-hidden="true">
        <div>
          {[...INTERESTS, ...INTERESTS, ...INTERESTS, ...INTERESTS].map(({ name }, i) => (
            <span key={i}>{name}</span>
          ))}
        </div>
      </div>
    </aside>

    <main className="auth-main">
      <div className="auth-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <span className="label">{label}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </main>
  </div>
);

export default AuthLayout;
