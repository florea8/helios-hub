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
