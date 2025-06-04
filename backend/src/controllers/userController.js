const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const userController = {
  async register(req, res) {
    try {
      const { name, email, password, role = 'player' } = req.body;
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await req.db
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const { data: user, error: insertError } = await req.db
        .from('users')
        .insert([
          {
            id: uuidv4(),
            name,
            email,
            password_hash: passwordHash,
            role
          }
        ])
        .select('id, name, email, role')
        .single();

      if (insertError) throw insertError;

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({ user, token });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const { data: user, error: findError } = await req.db
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (findError) throw findError;

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getProfile(req, res) {
    try {
      const { data: user, error } = await req.db
        .from('users')
        .select('id, name, email, role, created_at')
        .eq('id', req.user.id)
        .single();

      if (error) throw error;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  ,
  async list(req, res) {
    try {
      const { data: users, error } = await req.db
        .from('users')
        .select('id, name, email, role')
        .order('name', { ascending: true });

      if (error) throw error;

      res.json(users);
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = userController; 