import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import LoadingSkeleton from '../components/LoadingSkeleton';
import '../styles/Home.css';

const Home = () => {
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const { getTotalUnreadMessages, pendingFriendRequests } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="home-container">
        <div className="atmosphere-bg">
          <div className="gradient-mesh"></div>
          <div className="grid-pattern"></div>
        </div>
        <header className="main-header">
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
          </div>
        </header>
        <div style={{ padding: '150px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '50px', textAlign: 'center' }}>
            <div style={{ 
              width: '200px', 
              height: '60px', 
              background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
              borderRadius: '8px',
              margin: '0 auto 30px',
              animation: 'skeleton-loading 1.5s infinite'
            }}></div>
            <div style={{ 
              width: '400px', 
              height: '30px', 
              background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
              borderRadius: '8px',
              margin: '0 auto',
              animation: 'skeleton-loading 1.5s infinite'
            }}></div>
          </div>
          <LoadingSkeleton type="card" count={3} />
        </div>
      </div>
    );
  }

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
              <span className="badge-dot"></span>
              <span>The Future of Team Collaboration</span>
            </div>
            
            <h1 className="hero-headline">
              Build, Connect, and
              <span className="headline-gradient"> Collaborate Seamlessly</span>
            </h1>
            
            <p className="hero-description">
              Helios is the all-in-one collaboration platform that brings your team together. 
              From real-time messaging and AI assistance to task management and team spaces—
              everything you need to work better, faster.
            </p>

            <div className="hero-actions">
              {!user ? (
                <>
                  <Link to="/register" className="btn-primary">
                    <span>Get Started Free</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </Link>
                  <Link to="/login" className="btn-secondary">
                    <span>Sign In</span>
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

            <div className="hero-features-list">
              <div className="feature-pill">
                Real-time Messaging
              </div>
              <div className="feature-pill">
                AI-Powered Assistant
              </div>
              <div className="feature-pill">
                Task Management
              </div>
              <div className="feature-pill">
                Team Spaces
              </div>
            </div>
          </div>

          <div className="hero-visuals">
            <div className="visual-card card-animate-1">
              <h3>Real-Time Messaging</h3>
              <p>Instant communication with your team through direct messages and group chats</p>
            </div>

            <div className="visual-card card-animate-2">
              <h3>Smart Task Management</h3>
              <p>Organize projects, set deadlines, and track progress effortlessly</p>
            </div>

            <div className="visual-card card-animate-3">
              <h3>AI Assistant</h3>
              <p>Get instant help and intelligent suggestions powered by advanced AI</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar - Full Width */}
      <section className="stats-bar">
        <div className="stat-box">
          <div className="stat-number">5K+</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-box">
          <div className="stat-number">100K+</div>
          <div className="stat-label">Messages Sent</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-box">
          <div className="stat-number">2K+</div>
          <div className="stat-label">Team Rooms</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-box">
          <div className="stat-number">10K+</div>
          <div className="stat-label">Tasks Completed</div>
        </div>
      </section>

      {/* Trusted By Section - Full Width */}
      <section className="trusted-section">
        <p className="trusted-title">Trusted by collaboration teams worldwide</p>
        <div className="trusted-grid">
          <div className="company-logo">Teams</div>
          <div className="company-logo">Startups</div>
          <div className="company-logo">Freelancers</div>
          <div className="company-logo">Agencies</div>
          <div className="company-logo">Remote Workers</div>
          <div className="company-logo">Educators</div>
        </div>
      </section>

      {/* Features Showcase - Full Width */}
      <section className="features-showcase">
        <div className="section-intro">
          <h2 className="section-heading">Everything you need in one platform</h2>
          <p className="section-subheading">
            Streamline your workflow with powerful features designed for modern teams
          </p>
        </div>

        <div className="showcase-grid">
          <div className="showcase-card">
            <h3 className="showcase-title">Team Spaces</h3>
            <p className="showcase-text">Create dedicated workspaces for your projects with file sharing, chat, and collaboration tools.</p>
          </div>

          <div className="showcase-card">
            <h3 className="showcase-title">Smart Organization</h3>
            <p className="showcase-text">Tag, categorize, and organize content effortlessly with intelligent recommendations.</p>
          </div>

          <div className="showcase-card">
            <h3 className="showcase-title">Social Collaboration</h3>
            <p className="showcase-text">Share updates, provide feedback, and build meaningful connections with your network.</p>
          </div>

          <div className="showcase-card">
            <h3 className="showcase-title">Real-Time Updates</h3>
            <p className="showcase-text">Stay in sync with live notifications, instant messaging, and presence indicators.</p>
          </div>

          <div className="showcase-card">
            <h3 className="showcase-title">Lightning Fast</h3>
            <p className="showcase-text">Optimized performance ensures smooth collaboration without lag or delays.</p>
          </div>

          <div className="showcase-card">
            <h3 className="showcase-title">Enterprise Security</h3>
            <p className="showcase-text">Bank-level encryption, authentication, and access controls to protect your data.</p>
          </div>
        </div>
      </section>

      {/* Community Section - Live Terminal */}
      <section className="community-section-v3">
        <div className="community-grid-v3">
          <div className="community-terminal-side">
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <span className="terminal-title">helios_dashboard.js</span>
              </div>
              <div className="terminal-body">
                <div className="terminal-line">
                  <span className="prompt">$</span>
                  <span className="command">helios status --live</span>
                </div>
                <div className="terminal-output">
                  <div className="stat-line">
                    <span className="stat-label">→ Active Users:</span>
                    <span className="stat-value animate-count">5,284</span>
                    <span className="stat-badge">Online</span>
                  </div>
                  <div className="stat-line">
                    <span className="stat-label">→ Active Rooms:</span>
                    <span className="stat-value">432</span>
                    <span className="stat-badge">Live</span>
                  </div>
                  <div className="stat-line">
                    <span className="stat-label">→ Tasks Completed:</span>
                    <span className="stat-value animate-count">2,891</span>
                    <span className="stat-trend">↑ 67%</span>
                  </div>
                </div>
                <div className="terminal-line blink-cursor">
                  <span className="prompt">$</span>
                  <span className="command">join_helios()</span>
                  <span className="cursor">_</span>
                </div>
              </div>
            </div>
          </div>

          <div className="community-content-side">
            <div className="pulse-badge">
              <div className="pulse-dot"></div>
              <span>Live Activity</span>
            </div>
            <h2 className="community-title-v3">
              Join Thousands of
              <span className="gradient-text"> Collaborators</span>
            </h2>
            <p className="community-description-v3">
              Watch teams collaborate in real-time. Our community grows every day with 
              professionals, students, and teams who choose Helios for seamless communication 
              and project management.
            </p>

            <div className="live-activity-feed">
              <div className="activity-item fade-in-1">
                <span className="activity-user">Alex T.</span>
                <span className="activity-action">created a new room</span>
                <span className="activity-time">2s ago</span>
              </div>
              <div className="activity-item fade-in-2">
                <span className="activity-user">Emma K.</span>
                <span className="activity-action">completed a task</span>
                <span className="activity-time">5s ago</span>
              </div>
              <div className="activity-item fade-in-3">
                <span className="activity-user">Chris M.</span>
                <span className="activity-action">shared a post</span>
                <span className="activity-time">8s ago</span>
              </div>
            </div>

            <Link to={user ? "/dashboard" : "/register"} className="btn-terminal">
              <span>Start Collaborating Now</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
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
                  <pre className="code-content">{`"Build a real-time chat
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
                  <pre className="code-content">{`const ChatRoom = () => {
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
                  <pre className="code-content">{`✓ TypeScript types
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
                  <pre className="code-content">{`✓ Build successful
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

      {/* Testimonials Section */}
      <section className="testimonials-section-v3">
        <div className="testimonials-header">
          <h2 className="section-heading">Loved by teams everywhere</h2>
          <p className="section-subheading">
            See what our community has to say about Helios
          </p>
        </div>

        <div className="testimonials-container">
          <div className="testimonials-cards-stack">
            <div className="testimonial-card-v3 card-stack-1">
              <p className="card-quote">
                Helios transformed how our remote team communicates. The real-time chat and 
                task management features keep everyone aligned. Can't imagine working without it!
              </p>
              <div className="card-author">
                <div className="author-info">
                  <div className="author-name-v3">Sarah Mitchell</div>
                  <div className="author-title-v3">Team Lead @ DesignCo</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card-v3 card-stack-2">
              <p className="card-quote">
                The AI chatbot is incredibly helpful for quick questions, and having everything 
                in one place - chat, tasks, files - makes collaboration so much smoother.
              </p>
              <div className="card-author">
                <div className="author-info">
                  <div className="author-name-v3">James Davidson</div>
                  <div className="author-title-v3">Project Manager @ StartupHub</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card-v3 card-stack-3">
              <p className="card-quote">
                Our student group uses Helios for all our projects. The room feature is perfect 
                for group work, and sharing posts keeps everyone updated. Highly recommend!
              </p>
              <div className="card-author">
                <div className="author-info">
                  <div className="author-name-v3">Maria Chen</div>
                  <div className="author-title-v3">Student @ University</div>
                </div>
              </div>
            </div>
          </div>

          <div className="testimonials-stats-grid">
            <div className="stats-card">
              <div className="stats-number">4.9/5</div>
              <div className="stats-label">Average Rating</div>
              <div className="stats-stars">★★★★★</div>
            </div>
            <div className="stats-card">
              <div className="stats-number">1000+</div>
              <div className="stats-label">Active Teams</div>
              <div className="stats-trend">↑ 120% growth</div>
            </div>
            <div className="stats-card">
              <div className="stats-number">50K+</div>
              <div className="stats-label">Daily Messages</div>
              <div className="stats-pulse">
                <span className="pulse-dot"></span>
                Live
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Full Width */}
      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-headline">Start collaborating today</h2>
            <p className="cta-description">
              Join thousands of teams who trust Helios for seamless communication and project management. 
              Get started in minutes—no credit card required.
            </p>
            <Link to={user ? "/dashboard" : "/register"} className="btn-primary btn-large">
              <span>{user ? 'Go to Dashboard' : 'Get Started Free'}</span>
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
                <a href="#">Compliance</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="copyright">&copy; 2024 Helios. All rights reserved.</p>
            <div className="footer-social">
              <a href="#" className="social-link" aria-label="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
              <a href="#" className="social-link" aria-label="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
              <a href="#" className="social-link" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;