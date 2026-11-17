const db = require('../config/db');
const { interestsOf, setInterests } = require('../utils/interests');

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

    res.json({ ...user, interests: interestsOf(user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// Replace the signed-in user's interests
exports.updateInterests = (req, res) => {
  try {
    setInterests(req.user.id, req.body.tags);
    res.json({ interests: interestsOf(req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save interests' });
  }
};
