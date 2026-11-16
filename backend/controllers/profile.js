const db = require('../config/db');

// Get work experience
exports.getWorkExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const experience = db.prepare('SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC').all(userId);
    res.json(experience);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch work experience' });
  }
};

// Add work experience
exports.addWorkExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { company, position, description, start_date, end_date, is_current } = req.body;

    if (!company || !position) {
      return res.status(400).json({ message: 'Company and position are required' });
    }

    const stmt = db.prepare(
      'INSERT INTO work_experience (user_id, company, position, description, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(userId, company, position, description || null, start_date || null, end_date || null, is_current ? 1 : 0);

    res.status(201).json({
      id: result.lastInsertRowid,
      user_id: userId,
      company,
      position,
      description,
      start_date,
      end_date,
      is_current: !!is_current,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add work experience' });
  }
};

// Update work experience
exports.updateWorkExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { company, position, description, start_date, end_date, is_current } = req.body;

    // Verify ownership
    const exp = db.prepare('SELECT * FROM work_experience WHERE id = ? AND user_id = ?').get(id, userId);
    if (!exp) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    const stmt = db.prepare(
      'UPDATE work_experience SET company = ?, position = ?, description = ?, start_date = ?, end_date = ?, is_current = ? WHERE id = ?'
    );
    stmt.run(company, position, description || null, start_date || null, end_date || null, is_current ? 1 : 0, id);

    res.json({ message: 'Work experience updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update work experience' });
  }
};

// Delete work experience
exports.deleteWorkExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const exp = db.prepare('SELECT * FROM work_experience WHERE id = ? AND user_id = ?').get(id, userId);
    if (!exp) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    const stmt = db.prepare('DELETE FROM work_experience WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Work experience deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete work experience' });
  }
};

// Get skills
exports.getSkills = async (req, res) => {
  try {
    const userId = req.user.id;
    const skills = db.prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json(skills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
};

// Add skill
exports.addSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skill_name, proficiency } = req.body;

    if (!skill_name) {
      return res.status(400).json({ message: 'Skill name is required' });
    }

    // Check if skill already exists
    const existing = db.prepare('SELECT * FROM skills WHERE user_id = ? AND skill_name = ?').get(userId, skill_name);
    if (existing) {
      return res.status(409).json({ message: 'Skill already exists' });
    }

    const stmt = db.prepare(
      'INSERT INTO skills (user_id, skill_name, proficiency) VALUES (?, ?, ?)'
    );
    const result = stmt.run(userId, skill_name, proficiency || 'INTERMEDIATE');

    res.status(201).json({
      id: result.lastInsertRowid,
      user_id: userId,
      skill_name,
      proficiency: proficiency || 'INTERMEDIATE',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add skill' });
  }
};

// Update skill
exports.updateSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { proficiency } = req.body;

    // Verify ownership
    const skill = db.prepare('SELECT * FROM skills WHERE id = ? AND user_id = ?').get(id, userId);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const stmt = db.prepare('UPDATE skills SET proficiency = ? WHERE id = ?');
    stmt.run(proficiency || 'INTERMEDIATE', id);

    res.json({ message: 'Skill updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update skill' });
  }
};

// Delete skill
exports.deleteSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const skill = db.prepare('SELECT * FROM skills WHERE id = ? AND user_id = ?').get(id, userId);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const stmt = db.prepare('DELETE FROM skills WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Skill deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete skill' });
  }
};

// Update user profile (bio, social links, privacy)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, location, website, github_url, linkedin_url, twitter_url, is_profile_public } = req.body;

    const stmt = db.prepare(`
      UPDATE users 
      SET bio = ?, location = ?, website = ?, github_url = ?, linkedin_url = ?, twitter_url = ?, is_profile_public = ?
      WHERE id = ?
    `);
    
    stmt.run(
      bio || null, 
      location || null, 
      website || null, 
      github_url || null, 
      linkedin_url || null, 
      twitter_url || null,
      is_profile_public !== undefined ? (is_profile_public ? 1 : 0) : 1,
      userId
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// Get user profile (with privacy check)
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user?.id;

    const user = db.prepare(`
      SELECT id, username, email, role, profile_picture, bio, location, website, 
             github_url, linkedin_url, twitter_url, is_profile_public, points, created_at
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check privacy
    if (!user.is_profile_public && requesterId !== parseInt(userId)) {
      return res.status(403).json({ message: 'This profile is private' });
    }

    // Remove email if not own profile
    if (requesterId !== parseInt(userId)) {
      delete user.email;
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// Projects CRUD
exports.getProjects = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY display_order ASC, created_at DESC').all(userId);
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

exports.addProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, url, image_url, technologies, start_date, end_date, is_current } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO projects (user_id, title, description, url, image_url, technologies, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId, title, description || null, url || null, image_url || null,
      technologies || null, start_date || null, end_date || null, is_current ? 1 : 0
    );

    // Log activity
    logActivity(userId, 'PROJECT_ADDED', JSON.stringify({ title }));

    res.status(201).json({
      id: result.lastInsertRowid,
      user_id: userId,
      title,
      description,
      url,
      image_url,
      technologies,
      start_date,
      end_date,
      is_current: !!is_current,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add project' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, url, image_url, technologies, start_date, end_date, is_current, display_order } = req.body;

    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const stmt = db.prepare(`
      UPDATE projects 
      SET title = ?, description = ?, url = ?, image_url = ?, technologies = ?, 
          start_date = ?, end_date = ?, is_current = ?, display_order = ?
      WHERE id = ?
    `);
    
    stmt.run(
      title, description || null, url || null, image_url || null, technologies || null,
      start_date || null, end_date || null, is_current ? 1 : 0, display_order || 0, id
    );

    res.json({ message: 'Project updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

// Achievements
exports.getUserAchievements = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    const achievements = db.prepare(`
      SELECT a.*, ua.earned_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
      ORDER BY ua.earned_at DESC
    `).all(userId);

    res.json(achievements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch achievements' });
  }
};

exports.getAllAchievements = async (req, res) => {
  try {
    const achievements = db.prepare('SELECT * FROM achievements ORDER BY category, points ASC').all();
    res.json(achievements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch achievements' });
  }
};

// Activity Feed
exports.getUserActivity = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const activities = db.prepare(`
      SELECT * FROM activities 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(userId, limit);

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
};

// Helper function to log activity
const logActivity = (userId, activityType, activityData) => {
  try {
    db.prepare('INSERT INTO activities (user_id, activity_type, activity_data) VALUES (?, ?, ?)').run(userId, activityType, activityData);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};
