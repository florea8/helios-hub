import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import InterestTag from '../components/InterestTag';
import Ticker from '../components/Ticker';
import { INTERESTS } from '../interests';
import '../styles/Home.css';

// title, text, colour, corner radius of the shape
const STEPS = [
  ['Pick what you care about', 'Follow the interests that matter to you and see what people are asking, sharing and building around them.', 'var(--yellow)', '50%'],
  ['Ask, answer or pitch an idea', 'Post a question or a project. People who share the interest reply, and helpful posts earn points.', 'var(--tomato)', 0],
  ['Open a room and get to work', 'Turn any post into a room and move from talking about it to doing it.', 'var(--mint)', '50% 50% 0 0'],
];

const ROOM = [
  ['Live chat', 'Messages and files land the moment they are sent.'],
  ['Shared tasks', 'Split the work, set deadlines and get a reminder before they pass.'],
  ['Voice', 'Talk it through without leaving the room.'],
  ['Assistant', 'Ask the room assistant when everyone is stuck.'],
];

const Home = () => {
  const { user } = useAuth();
  const start = user ? '/dashboard' : '/register';

  return (
    <div className="home paper">
      <header className="topbar">
        <div className="wrap">
          <Logo />
          <ThemeToggle />
          {!user && (
            <Link to="/login" className="link">
              Sign in
            </Link>
          )}
          <Link to={start} className="button button-primary">
            {user ? 'Open dashboard' : 'Join'}
          </Link>
        </div>
      </header>

      <section className="wrap home-hero">
        <div>
          <span className="label">A network built around interests</span>
          <h1>
            Find your <span className="marker">people.</span> <em>Build</em> something together.
          </h1>
          <p>
            Helios gathers people around the things they care about, so they can talk it through,
            solve problems and start projects.
          </p>
          <div className="home-actions">
            <Link to={start} className="button button-primary">
              {user ? 'Open dashboard' : 'Create an account'}
            </Link>
            {!user && (
              <Link to="/login" className="button">
                Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="home-sample" aria-hidden="true">
          <i />
          <article>
            <span className="label">Example post</span>
            <InterestTag interest={INTERESTS[0]} />
            <h3>Anyone want to build a weather station with a Raspberry Pi?</h3>
            <p className="label">Mara · 12 replies · room open</p>
            <div className="home-actions">
              <span className="button button-primary">Join room</span>
              <span className="button">Reply</span>
            </div>
          </article>
        </div>
      </section>

      <Ticker />

      <section className="wrap home-section">
        <span className="label">How it works</span>
        <h2>From a shared interest to a finished project</h2>
        <ol className="home-steps">
          {STEPS.map(([title, text, color, radius], i) => (
            <li key={title}>
              <i style={{ background: color, borderRadius: radius }} />
              <span className="label">Step {i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap home-section">
        <span className="label">Inside a room</span>
        <h2>Everything a small team needs, in one place</h2>
        <ul className="home-room">
          {ROOM.map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-cta">
        <div className="wrap">
          <h2>Your people are already talking.</h2>
          <Link to={start} className="button">
            {user ? 'Open dashboard' : 'Join Helios'}
          </Link>
        </div>
      </section>

      <footer className="wrap home-footer label">
        <span>Helios</span>
        <div className="home-tags">
          {INTERESTS.map((interest) => (
            <InterestTag key={interest.name} interest={interest} />
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Home;
