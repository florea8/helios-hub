import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import '../styles/Home.css';

const Home = () => {
  const [scrollY, setScrollY] = useState(0);
  const { user, logout } = useAuth();
  const { getTotalUnreadMessages, pendingFriendRequests } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="home-container">
      {/* Atmospheric Background */}
      <div className="atmosphere-bg">
        <div className="gradient-mesh"></div>
        <div className="grid-pattern"></div>
      </div>

      {/* Header */}
      <header className={`main-header ${scrollY > 50 ? 'header-scrolled' : ''}`}>
        <div className="header-inner">
          <Link to="/" className="brand-logo">
            <svg className="logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#logo-grad)"/>
              <path d="M20 35L15 25H25L20 35Z" fill="url(#logo-grad)"/>
              <circle cx="20" cy="20" r="3" fill="url(#logo-grad)"/>
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff"/>
                  <stop offset="100%" stopColor="#41d1ff"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="brand-name">Helios</span>
          </Link>
          <nav className="main-nav">
            {user ? (
              <>
                <Link to="/dashboard" className="nav-item">Dashboard</Link>
                <Link to="/posts" className="nav-item">Posts</Link>
                <Link to="/rooms" className="nav-item">Rooms</Link>
                <Link to="/friends" className="nav-item nav-item-with-badge">
                  Friends
                  {(getTotalUnreadMessages() > 0 || pendingFriendRequests > 0) && (
                    <span className="notification-badge">
                      {getTotalUnreadMessages() + pendingFriendRequests}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="nav-item">Profile</Link>
                <Link to="/settings" className="nav-item">Settings</Link>
                <button onClick={logout} className="nav-item nav-logout">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-item">Login</Link>
                <Link to="/register" className="nav-cta">Get Started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section - Full Width */}
      <section className="hero-wrapper">
        <div className="hero-grid">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="badge-pulse"></span>
              <span>The Build Tool for Collaboration</span>
            </div>
            
            <h1 className="hero-headline">
              Welcome to
              <span className="headline-gradient"> Helios</span>
            </h1>
            
            <p className="hero-description">
              Your collaborative workspace for sharing ideas, connecting with friends, 
              and building amazing projects together. Experience real-time collaboration 
              like never before.
            </p>

            <div className="hero-actions">
              {!user ? (
                <>
                  <Link to="/register" className="btn-primary">
                    <span>Get Started</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </Link>
                  <Link to="/login" className="btn-secondary">
                    <span>View Demo</span>
                  </Link>
                </>
              ) : (
                <Link to="/dashboard" className="btn-primary">
                  <span>Go to Dashboard</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </Link>
              )}
            </div>

            <div className="code-snippet">
              <div className="snippet-header">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <code className="snippet-body">
                <span className="prompt">$</span>
                <span className="command"> npm create helios@latest</span>
              </code>
            </div>
          </div>

          <div className="hero-visuals">
            <div className="visual-card card-animate-1">
              <div className="card-top">
                <div className="hero-icon-wrapper">
                  <svg className="hero-svg" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
                          stroke="url(#hero-grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="hero-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#646cff"/>
                        <stop offset="100%" stopColor="#41d1ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <h3>Instant Start</h3>
              </div>
              <p>Lightning-fast collaboration with on-demand file serving</p>
              <div className="card-content">
                <div className="terminal-mock">
                  <div className="terminal-row">
                    <span className="time-stamp">10:24:35</span>
                    <span className="terminal-text">Server ready in 127ms</span>
                  </div>
                  <div className="terminal-row">
                    <span className="time-stamp">10:24:35</span>
                    <span className="success-text">✓ Connected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="visual-card card-animate-2">
              <div className="card-top">
                <div className="hero-icon-wrapper">
                  <svg className="hero-svg" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" 
                          stroke="url(#hero-grad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" 
                          stroke="url(#hero-grad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="hero-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#646cff"/>
                        <stop offset="100%" stopColor="#41d1ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <h3>Secure</h3>
              </div>
              <p>End-to-end encrypted communication</p>
              <div className="card-content">
                <div className="encryption-viz">
                  <div className="lock-icon"></div>
                  <div className="wave-rings"></div>
                </div>
              </div>
            </div>

            <div className="visual-card card-animate-3">
              <div className="card-top">
                <div className="hero-icon-wrapper">
                  <svg className="hero-svg" viewBox="0 0 24 24" fill="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" 
                             stroke="url(#hero-grad3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="hero-grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#646cff"/>
                        <stop offset="100%" stopColor="#41d1ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <h3>Modern</h3>
              </div>
              <p>Built with cutting-edge technology</p>
              <div className="card-content">
                <div className="tech-badges">
                  <span className="tech-tag">React</span>
                  <span className="tech-tag">Vite</span>
                  <span className="tech-tag">Node.js</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar - Full Width */}
      <section className="stats-bar">
        <div className="stat-box">
          <div className="stat-number">10K+</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-box">
          <div className="stat-number">50K+</div>
          <div className="stat-label">Projects Created</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-box">
          <div className="stat-number">99.9%</div>
          <div className="stat-label">Uptime</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-box">
          <div className="stat-number">150+</div>
          <div className="stat-label">Countries</div>
        </div>
      </section>

      {/* Trusted By Section - Full Width */}
      <section className="trusted-section">
        <p className="trusted-title">Trusted by teams worldwide</p>
        <div className="trusted-grid">
          <div className="company-logo">OpenAI</div>
          <div className="company-logo">Shopify</div>
          <div className="company-logo">Stripe</div>
          <div className="company-logo">Linear</div>
          <div className="company-logo">ClickUp</div>
          <div className="company-logo">Vercel</div>
        </div>
      </section>

      {/* Features Showcase - Full Width */}
      <section className="features-showcase">
        <div className="section-intro">
          <h2 className="section-heading">Redefining collaboration</h2>
          <p className="section-subheading">
            Helios makes teamwork enjoyable again with powerful features designed for modern teams
          </p>
        </div>

        <div className="showcase-grid">
          <div className="showcase-card">
            <div className="showcase-visual">
              <div className="code-preview">
                <div className="code-row">
                  <span className="code-comment">// Real-time updates</span>
                </div>
                <div className="code-row">
                  <span className="code-keyword">const</span>
                  <span> collaboration = </span>
                  <span className="code-string">'instant'</span>
                </div>
                <div className="code-row">
                  <span className="code-keyword">const</span>
                  <span> speed = </span>
                  <span className="code-string">'blazing'</span>
                </div>
              </div>
            </div>
            <h3 className="showcase-title">Lightning Fast HMR</h3>
            <p className="showcase-text">Instantly reflect changes as you collaborate, no matter how big your team is.</p>
          </div>

          <div className="showcase-card">
            <div className="showcase-visual">
              <div className="feature-tags-grid">
                <div className="feature-badge">TypeScript</div>
                <div className="feature-badge">JSX</div>
                <div className="feature-badge">Markdown</div>
                <div className="feature-badge">CSS</div>
                <div className="feature-badge">Workers</div>
                <div className="feature-badge">WASM</div>
              </div>
            </div>
            <h3 className="showcase-title">Rich Features</h3>
            <p className="showcase-text">TypeScript, JSX, CSS, Workers, and more - just a plugin away.</p>
          </div>

          <div className="showcase-card">
            <div className="showcase-visual">
              <div className="build-visual">
                <div className="progress-track">
                  <div className="progress-fill"></div>
                </div>
                <div className="build-info">
                  <span>✓ Optimized</span>
                  <span>327ms</span>
                </div>
              </div>
            </div>
            <h3 className="showcase-title">Optimized Build</h3>
            <p className="showcase-text">Advanced optimization and fine-grained control for production.</p>
          </div>
        </div>
      </section>

            {/* Community Section - Code Terminal Style with Live Activity */}
          <section className="community-section-v3">
          <div className="community-terminal-layout">
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="terminal-title">community@helios:~$</div>
              </div>
              <div className="terminal-body">
                <div className="terminal-line">
                  <span className="prompt">$</span>
                  <span className="command">helios stats --global</span>
                </div>
                <div className="terminal-output">
                  <div className="stat-line">
                    <span className="stat-label">→ Active Developers:</span>
                    <span className="stat-value animate-count">20,847</span>
                    <span className="stat-trend">↑ 12%</span>
                  </div>
                  <div className="stat-line">
                    <span className="stat-label">→ Code Generated:</span>
                    <span className="stat-value animate-count">5.2M</span>
                    <span className="stat-trend">↑ 340%</span>
                  </div>
                  <div className="stat-line">
                    <span className="stat-label">→ Countries:</span>
                    <span className="stat-value">127</span>
                    <span className="stat-badge">🌍</span>
                  </div>
                  <div className="stat-line">
                    <span className="stat-label">→ Projects Deployed:</span>
                    <span className="stat-value animate-count">8,451</span>
                    <span className="stat-trend">↑ 89%</span>
                  </div>
                </div>
                <div className="terminal-line blink-cursor">
                  <span className="prompt">$</span>
                  <span className="command">join_community()</span>
                  <span className="cursor">_</span>
                </div>
              </div>
            </div>

            <div className="community-content-side">
              <div className="pulse-badge">
                <div className="pulse-dot"></div>
                <span>Live Community</span>
              </div>
              <h2 className="community-title-v3">
                Join the Revolution in
                <span className="gradient-text"> Real-Time</span>
              </h2>
              <p className="community-description-v3">
                Watch developers around the world build, ship, and collaborate in real-time. 
                Our community grows every second with passionate creators pushing boundaries.
              </p>

              <div className="live-activity-feed">
                <div className="activity-item fade-in-1">
                  <div className="activity-dot"></div>
                  <span className="activity-user">Sarah M.</span>
                  <span className="activity-action">deployed a new app</span>
                  <span className="activity-time">2s ago</span>
                </div>
                <div className="activity-item fade-in-2">
                  <div className="activity-dot"></div>
                  <span className="activity-user">James K.</span>
                  <span className="activity-action">joined the platform</span>
                  <span className="activity-time">5s ago</span>
                </div>
                <div className="activity-item fade-in-3">
                  <div className="activity-dot"></div>
                  <span className="activity-user">Maria C.</span>
                  <span className="activity-action">shared a project</span>
                  <span className="activity-time">8s ago</span>
                </div>
              </div>

              <Link to={user ? "/dashboard" : "/register"} className="btn-terminal">
                <span>$ join_now --get-started</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>
      
      {/* Integration Section - Workflow Code Animation */}
      <section className="integration-section-v3">
          <div className="workflow-header">
            <h2 className="workflow-title">
              Build at the
              <span className="gradient-text"> Speed of Thought</span>
            </h2>
            <p className="workflow-subtitle">
              Describe → Generate → Refine → Deploy. The future of development is here.
            </p>
          </div>

          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3>Describe</h3>
                <div className="code-box">
                  <div className="code-header">
                    <span className="code-lang">prompt</span>
                  </div>
                  <pre className="code-content">
{`"Build a real-time chat
with user presence and
typing indicators"`}</pre>
                </div>
              </div>
            </div>

            <div className="step-arrow">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="url(#arrow-grad)" strokeWidth="2"/>
                <defs>
                  <linearGradient id="arrow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#646cff"/>
                    <stop offset="100%" stopColor="#41d1ff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="workflow-step">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3>Generate</h3>
                <div className="code-box">
                  <div className="code-header">
                    <span className="code-lang">TypeScript</span>
                    <div className="generating-indicator">
                      <div className="gen-dot"></div>
                      <div className="gen-dot"></div>
                      <div className="gen-dot"></div>
                    </div>
                  </div>
                  <pre className="code-content">
{`const ChatRoom = () => {
  const [users, setUsers] =
    useState<User[]>([]);
  // AI generating...`}</pre>
                </div>
              </div>
            </div>

            <div className="step-arrow">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="url(#arrow-grad2)" strokeWidth="2"/>
                <defs>
                  <linearGradient id="arrow-grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#646cff"/>
                    <stop offset="100%" stopColor="#41d1ff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="workflow-step">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3>Refine</h3>
                <div className="code-box">
                  <div className="code-header">
                    <span className="code-lang">Review</span>
                    <span className="code-status success">✓ Tests Passing</span>
                  </div>
                  <pre className="code-content">
{`✓ TypeScript types
✓ Error handling
✓ Performance optimized`}</pre>
                </div>
              </div>
            </div>

            <div className="step-arrow">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="url(#arrow-grad3)" strokeWidth="2"/>
                <defs>
                  <linearGradient id="arrow-grad3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#646cff"/>
                    <stop offset="100%" stopColor="#41d1ff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="workflow-step">
              <div className="step-number">04</div>
              <div className="step-content">
                <h3>Deploy</h3>
                <div className="code-box deploy-box">
                  <div className="code-header">
                    <span className="code-lang">Production</span>
                    <span className="code-status deploying">🚀 Live</span>
                  </div>
                  <pre className="code-content">
{`✓ Build successful
✓ Deployed to edge
→ chat.helios.dev`}</pre>
                </div>
              </div>
            </div>
          </div>

          <div className="workflow-tools-marquee">
            <div className="marquee-content">
              <div className="tool-badge">Cursor</div>
              <div className="tool-badge">Windsurf</div>
              <div className="tool-badge">Claude Code</div>
              <div className="tool-badge">GitHub Copilot</div>
              <div className="tool-badge">V0</div>
              <div className="tool-badge">Gemini</div>
              <div className="tool-badge">Cursor</div>
              <div className="tool-badge">Windsurf</div>
              <div className="tool-badge">Claude Code</div>
              <div className="tool-badge">GitHub Copilot</div>
            </div>
          </div>
        </section>

      {/* Testimonials Section - Interactive Card Stack */}
      <section className="testimonials-section-v3">
          <div className="testimonials-container">
            <div className="testimonials-left-panel">
              <div className="rating-display">
                <div className="stars">
                </div>
                <div className="rating-score">4.9/5.0</div>
                <div className="rating-count">from 2,847 reviews</div>
              </div>

              <h2 className="testimonials-headline">
                Developers Love
                <span className="gradient-text"> Building with Helios</span>
              </h2>

              <div className="testimonials-stats-grid">
                <div className="stat-box">
              
                  <div className="stat-metric">10x</div>
                  <div className="stat-text">Faster Development</div>
                </div>
                <div className="stat-box">
                  <div className="stat-metric">98%</div>
                  <div className="stat-text">Satisfaction Rate</div>
                </div>
                <div className="stat-box">
                  <div className="stat-metric">50K+</div>
                  <div className="stat-text">Apps Deployed</div>
                </div>
              </div>

              <div className="code-snippet-review">
                <div className="snippet-header">
                  <div className="snippet-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="snippet-title">developer_review.js</span>
                </div>
                <pre className="snippet-code">
{`const review = {
  platform: "Helios",
  rating: 5,
  would_recommend: true,
  comment: "Game changer! 🚀"
};`}</pre>
              </div>
            </div>

            <div className="testimonials-cards-stack">
              <div className="testimonial-card-v3 card-stack-1">
                <div className="card-quote-icon">"</div>
                <p className="card-quote">
                  Helios transformed our entire development workflow. We're shipping features 
                  10x faster than before, and the code quality is actually better.
                </p>
                <div className="card-author">
                  <div className="author-avatar-v3">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect fill='%23646cff' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='18' font-weight='bold'%3ESM%3C/text%3E%3C/svg%3E" alt="SM" />
                  </div>
                  <div>
                    <div className="author-name-v3">Sarah Mitchell</div>
                    <div className="author-title-v3">Lead Developer @ TechCorp</div>
                  </div>
                </div>
                <div className="card-badge-verified">✓ Verified User</div>
              </div>

              <div className="testimonial-card-v3 card-stack-2">
                <div className="card-quote-icon">"</div>
                <p className="card-quote">
                  I was skeptical about AI coding tools, but Helios is different. It understands 
                  context, writes clean code, and actually saves me hours every day.
                </p>
                <div className="card-author">
                  <div className="author-avatar-v3">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect fill='%2341d1ff' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='18' font-weight='bold'%3EJD%3C/text%3E%3C/svg%3E" alt="JD" />
                  </div>
                  <div>
                    <div className="author-name-v3">James Davidson</div>
                    <div className="author-title-v3">Senior Engineer @ StartupXYZ</div>
                  </div>
                </div>
                <div className="card-badge-verified">✓ Verified User</div>
              </div>

              <div className="testimonial-card-v3 card-stack-3">
                <div className="card-quote-icon">"</div>
                <p className="card-quote">
                  The real-time collaboration features are phenomenal. Our remote team feels 
                  more connected than ever. Best investment we've made this year!
                </p>
                <div className="card-author">
                  <div className="author-avatar-v3">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect fill='%23a855f7' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='18' font-weight='bold'%3EMC%3C/text%3E%3C/svg%3E" alt="MC" />
                  </div>
                  <div>
                    <div className="author-name-v3">Maria Chen</div>
                    <div className="author-title-v3">Product Manager @ InnovateLabs</div>
                  </div>
                </div>
                <div className="card-badge-verified">✓ Verified User</div>
              </div>
            </div>
          </div>
        </section>

      {/* CTA Section - Full Width */}
      <section className="cta-section">
          <div className="cta-box">
            <h2 className="cta-headline">Start building with Helios</h2>
            <p className="cta-description">
              Prepare for a collaboration environment that can finally keep pace with your team's speed.
            </p>
            <Link to={user ? "/dashboard" : "/register"} className="btn-primary btn-large">
              <span>{user ? 'Open Dashboard' : 'Get Started for Free'}</span>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </Link>
          </div>
        </section>

      {/* Footer - Full Width */}
      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                <svg className="logo-icon" viewBox="0 0 40 40" fill="none">
                  <path d="M20 5L25 15H15L20 5Z" fill="url(#footer-grad)"/>
                  <path d="M20 35L15 25H25L20 35Z" fill="url(#footer-grad)"/>
                  <circle cx="20" cy="20" r="3" fill="url(#footer-grad)"/>
                  <defs>
                    <linearGradient id="footer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#646cff"/>
                      <stop offset="100%" stopColor="#41d1ff"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span>Helios</span>
              </div>
              <p>Building the future of collaboration</p>
            </div>

            <div className="footer-columns">
              <div className="footer-col">
                <h4>Product</h4>
                <a href="#">Features</a>
                <a href="#">Pricing</a>
                <a href="#">Changelog</a>
                <a href="#">Roadmap</a>
              </div>
              <div className="footer-col">
                <h4>Resources</h4>
                <a href="#">Documentation</a>
                <a href="#">Guides</a>
                <a href="#">API Reference</a>
                <a href="#">Community</a>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Blog</a>
                <a href="#">Careers</a>
                <a href="#">Contact</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Security</a>
                <a href="#">Cookies</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 Helios. Built with ❤️ using React & Vite.</p>
            <div className="social-links">
              <a href="#">GitHub</a>
              <a href="#">Twitter</a>
              <a href="#">Discord</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
