import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import InterestTag from '../components/InterestTag';
import Ticker from '../components/Ticker';
import { INTERESTS } from '../interests';
import '../styles/Home.css';

// Example posts per interest: title, author, replies, state.
const POSTS = {
  Electronics: [
    ['Anyone want to build a weather station with a Raspberry Pi?', 'Mara', 12, 'room open'],
    ['Why does my ESP32 reset whenever the motor starts?', 'Ilie', 7, 'solved'],
    ['Looking for two people to design an open keyboard PCB', 'Dana', 4, 'room open'],
  ],
  Photography: [
    ['How do you keep stars sharp past a 30 second exposure?', 'Teo', 9, 'solved'],
    ['Critique my street series from Lisbon', 'Ana', 15, 'open'],
    ['Starting a 52-week photo project. Who is in?', 'Radu', 21, 'room open'],
  ],
  Chess: [
    ['Stuck at 1400. What should I study next?', 'Vlad', 18, 'open'],
    ['Working through the Najdorf together on Sundays', 'Ioana', 6, 'room open'],
    ['I built a puzzle trainer and need testers', 'Alex', 11, 'room open'],
  ],
  'Open source': [
    ['First-timers welcome: help document a small CLI tool', 'Sara', 8, 'room open'],
    ['How do you review a pull request you only half understand?', 'Paul', 14, 'solved'],
    ['A date library needs a second maintainer', 'Irina', 3, 'open'],
  ],
  'Music production': [
    ['My mixes sound muddy around 200 Hz', 'Luca', 10, 'solved'],
    ['Trade stems and remix each other this month', 'Bianca', 17, 'room open'],
    ['Can you sidechain without a compressor?', 'Matei', 5, 'open'],
  ],
};

const CHAT = [
  ['Mara', 'Sensors arrived. A BME280 for temperature and pressure.'],
  ['Ilie', 'Nice. I can print the enclosure this weekend.'],
  ['Assistant', 'The BME280 talks over I2C: wire SDA to GPIO 2 and SCL to GPIO 3.'],
  ['Dana', 'I will set up the dashboard once data comes in.'],
];

const TASKS = ['Pick the sensors', 'Wire the breadboard', 'Print the enclosure'];

// key, title, text. Hovering one outlines the matching part of the room.
const FEATURES = [
  ['chat', 'Live chat', 'Messages and files land the moment they are sent.'],
  ['tasks', 'Shared tasks', 'Split the work, set deadlines, get reminded before they pass.'],
  ['voice', 'Voice', 'Talk it through without leaving the room.'],
  ['bot', 'Assistant', 'Ask the room assistant when everyone is stuck.'],
];

const Home = () => {
  const { user } = useAuth();
  const [interest, setInterest] = useState(INTERESTS[0]);
  const [done, setDone] = useState([true, false, false]);
  const [focus, setFocus] = useState(null);
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
            <InterestTag interest={INTERESTS[0]} />
            <h3>{POSTS.Electronics[0][0]}</h3>
            <p className="label">Mara · 12 replies · room open</p>
            <div className="home-actions">
              <span className="button button-primary">Join room</span>
              <span className="button">Reply</span>
            </div>
          </article>
        </div>
      </section>

      <Ticker />

      <section className="wrap home-explore">
        <div>
          <span className="label">01 / Start with an interest</span>
          <h2>Pick one and see what people are working on</h2>
          <div className="home-picks">
            {INTERESTS.map((item) => (
              <button
                key={item.name}
                type="button"
                className="tag"
                style={{ '--c': item.color, '--p': item.shape }}
                aria-pressed={item === interest}
                onClick={() => setInterest(item)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <p className="label">Example posts</p>
        </div>

        {/* The key restarts the entrance animation when the interest changes. */}
        <ol key={interest.name} className="home-posts" style={{ '--c': interest.color, '--p': interest.shape }}>
          {POSTS[interest.name].map(([title, author, replies, state], i) => (
            <li key={title} style={{ '--i': i }}>
              <i />
              <div>
                <h3>{title}</h3>
                <p className="label">
                  {author} · {replies} replies
                </p>
              </div>
              <span className="label" data-state={state}>
                {state}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap home-room">
        <div>
          <span className="label">02 / Open a room</span>
          <h2>Move from talking about it to doing it</h2>
          <dl>
            {FEATURES.map(([key, title, text]) => (
              <div key={key} onMouseEnter={() => setFocus(key)} onMouseLeave={() => setFocus(null)}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="room" data-focus={focus}>
          <div className="room-bar label">
            <span>rooms / weather-station</span>
            <span>4 online</span>
          </div>
          <ul className="room-chat">
            {CHAT.map(([who, text]) => (
              <li key={who} data-bot={who === 'Assistant' || undefined}>
                <b>{who}</b>
                {text}
              </li>
            ))}
          </ul>
          <div className="room-side">
            <div className="room-tasks">
              <span className="label">
                Tasks {done.filter(Boolean).length}/{TASKS.length}
              </span>
              {TASKS.map((task, i) => (
                <label key={task}>
                  <input
                    type="checkbox"
                    checked={done[i]}
                    onChange={() => setDone(done.map((d, j) => (j === i ? !d : d)))}
                  />
                  <span>{task}</span>
                </label>
              ))}
            </div>
            <div className="room-voice">
              <span className="label">Voice</span>
              <div aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <i key={i} style={{ '--i': i }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-words">
        <div className="wrap">
          <p>Talk it through.</p>
          <p>Solve it.</p>
          <p>Build it.</p>
        </div>
      </section>

      <section className="home-cta">
        <div className="wrap">
          <h2>Your people are already talking.</h2>
          <Link to={start} className="button">
            {user ? 'Open dashboard' : 'Join Helios'}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
