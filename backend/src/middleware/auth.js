const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    console.log('Checking role. User role:', req.user.role, 'Required roles:', roles);
    if (!roles.includes(req.user.role)) {
      console.log('Role check failed');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    console.log('Role check passed');
    next();
  };
};

module.exports = { auth, checkRole }; 