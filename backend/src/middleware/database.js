const supabase = require('../config/database');

const database = (req, res, next) => {
  try {
    req.db = supabase;
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = database; 