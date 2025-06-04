const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const database = require('./middleware/database');
let authRoutes;
let tournamentRoutes;
if (process.env.NODE_ENV !== 'test') {
  authRoutes = require('./routes/auth');
  tournamentRoutes = require('./routes/tournaments');
}

dotenv.config();

const app = express();

// Configuração CORS mais específica
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(morgan('dev'));
app.use(database);

// Routes
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', authRoutes);
  app.use('/api/tournaments', tournamentRoutes);
}

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
