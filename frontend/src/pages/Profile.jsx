import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/Profile.css';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || null);
  const [workExperience, setWorkExperience] = useState([]);
  const [skills, setSkills] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Work Experience form state
  const [expForm, setExpForm] = useState({ company: '', position: '', description: '', start_date: '', end_date: '', is_current: false });
  const [showExpForm, setShowExpForm] = useState(false);

  // Skills form state
  const [skillForm, setSkillForm] = useState({ skill_name: '', proficiency: 'INTERMEDIATE' });
  const [showSkillForm, setShowSkillForm] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchWorkExperience();
      fetchSkills();
    }
  }, [user]);

  const fetchWorkExperience = async () => {
    try {
      const res = await api.get('/api/profile/work-experience');
      setWorkExperience(res.data);
    } catch (err) {
      console.error('Failed to fetch work experience:', err);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await api.get('/api/profile/skills');
      setSkills(res.data);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const base64String = event.target?.result;
        const res = await api.post('/api/auth/upload-profile-picture', { file: base64String });
        setProfilePicture(res.data.profile_picture);
        updateUser({ profile_picture: res.data.profile_picture });
        setError('');
      } catch (err) {
        setError('Failed to upload profile picture: ' + (err.response?.data?.message || err.message));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
      setLoading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleAddWorkExperience = async () => {
    if (!expForm.company.trim() || !expForm.position.trim()) {
      setError('Company and position are required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/profile/work-experience', expForm);
      setExpForm({ company: '', position: '', description: '', start_date: '', end_date: '', is_current: false });
      setShowExpForm(false);
      fetchWorkExperience();
      setError('');
    } catch (err) {
      setError('Failed to add work experience');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkExperience = async (id) => {
    if (!window.confirm('Delete this experience?')) return;

    try {
      setLoading(true);
      await api.delete(`/api/profile/work-experience/${id}`);
      fetchWorkExperience();
      setError('');
    } catch (err) {
      setError('Failed to delete work experience');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!skillForm.skill_name.trim()) {
      setError('Skill name is required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/profile/skills', skillForm);
      setSkillForm({ skill_name: '', proficiency: 'INTERMEDIATE' });
      setShowSkillForm(false);
      fetchSkills();
      setError('');
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Skill already exists');
      } else {
        setError('Failed to add skill');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!window.confirm('Delete this skill?')) return;

    try {
      setLoading(true);
      await api.delete(`/api/profile/skills/${id}`);
      fetchSkills();
      setError('');
    } catch (err) {
      setError('Failed to delete skill');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getProficiencyColor = (proficiency) => {
    switch (proficiency) {
      case 'BEGINNER':
        return '#ff6b6b';
      case 'INTERMEDIATE':
        return '#ffd93d';
      case 'ADVANCED':
        return '#6bcf7f';
      case 'EXPERT':
        return '#646cff';
      default:
        return '#a0a0a0';
    }
  };

  return (
    <div className="profile-container">
      <div className="atmosphere-bg">
        <div className="gradient-mesh"></div>
        <div className="grid-pattern"></div>
      </div>

      <header className={`main-header ${scrollY > 50 ? 'header-scrolled' : ''}`}>
        <div className="header-inner">
          <Link to="/" className="brand-logo">
            <svg className="logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#logo-grad)" />
              <path d="M20 35L15 25H25L20 35Z" fill="url(#logo-grad)" />
              <circle cx="20" cy="20" r="3" fill="url(#logo-grad)" />
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff" />
                  <stop offset="100%" stopColor="#41d1ff" />
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
                <Link to="/friends" className="nav-item">Friends</Link>
                <Link to="/profile" className="nav-item nav-active">Profile</Link>
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

      <main className="profile-main">
        <div className="profile-layout">
          {/* Left Sidebar */}
          <aside className="profile-sidebar">
            <div className="profile-card">
              <div className="profile-picture-wrapper">
                <div className="profile-picture">
                  {profilePicture ? (
                    <img src={`http://localhost:5000/${profilePicture}`} alt={user?.username} />
                  ) : (
                    <div className="profile-picture-placeholder">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <button
                  className="profile-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Upload profile picture"
                >
                  📷
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  style={{ display: 'none' }}
                />
              </div>

              <h2 className="profile-username">{user?.username}</h2>
              <p className="profile-email">{user?.email}</p>
            </div>

            {/* Work Experience Section */}
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Work Experience</h3>
                <button
                  className="section-add-btn"
                  onClick={() => setShowExpForm(!showExpForm)}
                >
                  +
                </button>
              </div>

              {showExpForm && (
                <div className="form-container">
                  <input
                    type="text"
                    placeholder="Company"
                    value={expForm.company}
                    onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Position"
                    value={expForm.position}
                    onChange={(e) => setExpForm({ ...expForm, position: e.target.value })}
                    className="form-input"
                  />
                  <textarea
                    placeholder="Description"
                    value={expForm.description}
                    onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                    className="form-textarea"
                    rows="3"
                  />
                  <input
                    type="date"
                    value={expForm.start_date}
                    onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="date"
                    value={expForm.end_date}
                    onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value })}
                    className="form-input"
                    disabled={expForm.is_current}
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={expForm.is_current}
                      onChange={(e) => setExpForm({ ...expForm, is_current: e.target.checked, end_date: e.target.checked ? '' : expForm.end_date })}
                    />
                    Currently working here
                  </label>
                  <div className="form-buttons">
                    <button
                      className="btn-primary"
                      onClick={handleAddWorkExperience}
                      disabled={loading}
                    >
                      Add Experience
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowExpForm(false)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="experience-list">
                {workExperience.length > 0 ? (
                  workExperience.map((exp) => (
                    <div key={exp.id} className="experience-item">
                      <div className="experience-header">
                        <h4 className="experience-position">{exp.position}</h4>
                        <button
                          className="item-delete-btn"
                          onClick={() => handleDeleteWorkExperience(exp.id)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="experience-company">{exp.company}</p>
                      {exp.description && <p className="experience-description">{exp.description}</p>}
                      <p className="experience-dates">
                        {exp.start_date} {exp.end_date ? `- ${exp.end_date}` : exp.is_current ? '- Present' : ''}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="empty-message">No work experience yet</p>
                )}
              </div>
            </div>

            {/* Skills Section */}
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Skills</h3>
                <button
                  className="section-add-btn"
                  onClick={() => setShowSkillForm(!showSkillForm)}
                >
                  +
                </button>
              </div>

              {showSkillForm && (
                <div className="form-container">
                  <input
                    type="text"
                    placeholder="Skill name"
                    value={skillForm.skill_name}
                    onChange={(e) => setSkillForm({ ...skillForm, skill_name: e.target.value })}
                    className="form-input"
                  />
                  <select
                    value={skillForm.proficiency}
                    onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value })}
                    className="form-select"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                  <div className="form-buttons">
                    <button
                      className="btn-primary"
                      onClick={handleAddSkill}
                      disabled={loading}
                    >
                      Add Skill
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowSkillForm(false)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="skills-list">
                {skills.length > 0 ? (
                  skills.map((skill) => (
                    <div key={skill.id} className="skill-item">
                      <div className="skill-info">
                        <span className="skill-name">{skill.skill_name}</span>
                        <span className="skill-badge" style={{ backgroundColor: getProficiencyColor(skill.proficiency) }}>
                          {skill.proficiency}
                        </span>
                      </div>
                      <button
                        className="item-delete-btn"
                        onClick={() => handleDeleteSkill(skill.id)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="empty-message">No skills yet</p>
                )}
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <section className="profile-content">
            <div className="profile-info-card">
              <h3>Profile Overview</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Member since</span>
                  <span className="info-value">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ro-RO') : 'Unknown'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Experience Count</span>
                  <span className="info-value">{workExperience.length}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Skills Count</span>
                  <span className="info-value">{skills.length}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {error && (
          <div className="error-toast">
            {error}
            <button onClick={() => setError('')} className="toast-close">✕</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
