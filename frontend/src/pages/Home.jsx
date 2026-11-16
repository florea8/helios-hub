import { useEffect, useRef, useState } from 'react';
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

// name, status line, online
const FRIENDS = [
  ['Mara', 'online', true],
  ['Ilie', 'online', true],
  ['Dana', 'seen 2 h ago', false],
];

const REPLIES = [
  'Count me in.',
  'Send me the files and I will take a look tonight.',
  'Good idea. Let us open a room for it.',
];

const Home = () => {
  const { user } = useAuth();
  const [interest, setInterest] = useState(INTERESTS[0]);
  const [done, setDone] = useState([true, false, false]);
  const [focus, setFocus] = useState(null);
  const [liked, setLiked] = useState(false);
  const [draft, setDraft] = useState('');
  const [thread, setThread] = useState([
    ['Mara', 'Saw your post about the weather station. Still need help with the enclosure?'],
    ['You', 'Yes! Do you have a printer?'],
    ['Mara', 'I do. PETG or PLA?'],
  ]);
  const threadRef = useRef(null);
  const waiting = thread[thread.length - 1][0] === 'You';

  // Mara answers a moment after you write, so the demo feels like a conversation.
  useEffect(() => {
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
    if (!waiting) return;
    const timer = setTimeout(
      () => setThread((t) => [...t, ['Mara', REPLIES[t.length % REPLIES.length]]]),
      1200
    );
    return () => clearTimeout(timer);
  }, [waiting, thread.length]);

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setThread([...thread, ['You', draft.trim()]]);
    setDraft('');
  };
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

      <section className="wrap home-explore" id="interests">
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

      <section className="wrap home-room" id="rooms">
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

      <section className="wrap home-room home-dm" id="messages">
        <div className="room dm">
          <div className="room-bar label">
            <span>messages / mara</span>
            <span>online</span>
          </div>
          <ul className="dm-people">
            {FRIENDS.map(([name, status, online], i) => (
              <li key={name} data-current={i === 0 || undefined}>
                <i data-online={online || undefined} />
                <div>
                  <b>{name}</b>
                  <span className="label">{status}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="dm-thread">
            <ul className="room-chat" ref={threadRef}>
              {thread.map(([who, text], i) => (
                <li key={i} data-me={who === 'You' || undefined}>
                  {text}
                </li>
              ))}
              {waiting && <li className="label">Mara is typing…</li>}
            </ul>
            <form onSubmit={send}>
              <input
                className="field-input"
                aria-label="Message to Mara"
                placeholder="Try it: write to Mara"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="button button-primary">
                Send
              </button>
            </form>
          </div>
        </div>

        <div>
          <span className="label">03 / Keep in touch</span>
          <h2>Message the people you click with</h2>
          <p>
            Add someone as a friend and talk one to one. You see who is online, when they are
            typing, and you get a notification the moment they answer.
          </p>
        </div>
      </section>

      <section className="wrap home-room home-points" id="points">
        <div>
          <span className="label">04 / Helping counts</span>
          <h2>Good posts earn you a reputation</h2>
          <p>
            Each like on something you posted is one point and each reply is two. Your total sits
            on your profile, so people can tell who shows up and helps.
          </p>
        </div>
        <div className="home-score">
          <button type="button" className="button" aria-pressed={liked} onClick={() => setLiked(!liked)}>
            {liked ? 'Liked' : 'Like this post'}
          </button>
          <p>
            <b key={liked}>{128 + (liked ? 1 : 0)}</b>
            <span className="label">Points for Mara</span>
          </p>
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

      <footer className="home-footer">
        <div className="wrap">
          <div>
            <Logo />
            <p>A place to find people who care about what you care about.</p>
          </div>
          <nav aria-label="On this page">
            <span className="label">On this page</span>
            <a href="#interests">Interests</a>
            <a href="#rooms">Rooms</a>
            <a href="#messages">Messages</a>
            <a href="#points">Points</a>
          </nav>
          <nav aria-label="Account">
            <span className="label">Account</span>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create an account</Link>
          </nav>
        </div>
        <p className="wrap label">Helios · 2026 · Built with React, Express and Socket.IO</p>
      </footer>
    </div>
  );
};

export default Home;
