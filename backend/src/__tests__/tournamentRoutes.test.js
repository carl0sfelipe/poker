const request = require('supertest');
const express = require('express');
const tournamentRoutes = require('../routes/tournaments');
const bodyParser = require('body-parser');

// Mock middlewares and controller dependencies
jest.mock('../middleware/auth', () => ({
  auth: (req, res, next) => { req.user = { id: 'test-user', role: 'admin' }; next(); },
  checkRole: () => (req, res, next) => next()
}));

jest.mock('../controllers/tournamentController', () => {
  return {
    create: jest.fn((req, res) => res.status(201).json({ id: 't1' })),
    list: jest.fn((req, res) => res.json([{ id: 't1', name: 'T1' }])),
    getById: jest.fn((req, res) => res.json({ id: 't1', name: 'T1' })),
    register: jest.fn((req, res) => res.status(200).json({ success: true })),
    manualRegister: jest.fn((req, res) => res.status(201).json({ id: 'reg1' })),
    checkIn: jest.fn((req, res) => res.status(200).json({ checked_in: true })),
    eliminate: jest.fn((req, res) => res.status(200).json({ eliminated: true })),
    exportResults: jest.fn((req, res) => res.status(200).send('csvdata')),
    delete: jest.fn((req, res) => res.status(204).send()),
    addRebuy: jest.fn((req, res) => res.status(200).json({ rebuy: true })),
    addAddon: jest.fn((req, res) => res.status(200).json({ addon: true })),
    settlePayment: jest.fn((req, res) => res.status(200).json({ settled: true })),
    updateRebuyCount: jest.fn((req, res) => res.status(200).json({ updated: true }))
  };
});

const app = express();
app.use(bodyParser.json());
app.use('/api/tournaments', tournamentRoutes);

describe('Tournament Routes', () => {
  it('GET /api/tournaments should list tournaments', async () => {
    const res = await request(app).get('/api/tournaments');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/tournaments should create a tournament', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .send({ name: 'Novo', start_time: new Date(), starting_stack: 1000, blind_structure: [] });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('GET /api/tournaments/:id should get a tournament', async () => {
    const res = await request(app).get('/api/tournaments/t1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 't1');
  });

  it('POST /api/tournaments/:id/delete should delete a tournament', async () => {
    const res = await request(app).post('/api/tournaments/t1/delete');
    expect(res.statusCode).toBe(204);
  });

  it('DELETE /api/tournaments/:id should delete a tournament', async () => {
    const res = await request(app).delete('/api/tournaments/t1');
    expect(res.statusCode).toBe(204);
  });

  it('POST /api/tournaments/:id/register should register', async () => {
    const res = await request(app).post('/api/tournaments/t1/register');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/tournaments/:id/manual-register should manual register', async () => {
    const res = await request(app).post('/api/tournaments/t1/manual-register').send({ name: 'A', email: 'a@a.com' });
    expect(res.statusCode).toBe(201);
  });

  it('POST /api/tournaments/:id/checkin should checkin', async () => {
    const res = await request(app).post('/api/tournaments/t1/checkin');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/tournaments/:id/eliminate should eliminate', async () => {
    const res = await request(app).post('/api/tournaments/t1/eliminate');
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/tournaments/:id/export should export', async () => {
    const res = await request(app).get('/api/tournaments/t1/export');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/tournaments/:id/rebuy should rebuy', async () => {
    const res = await request(app).post('/api/tournaments/t1/rebuy');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/tournaments/:id/addon should addon', async () => {
    const res = await request(app).post('/api/tournaments/t1/addon');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/tournaments/:id/settle-payment should settle payment', async () => {
    const res = await request(app).post('/api/tournaments/t1/settle-payment');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/tournaments/:id/update-rebuys should update rebuy count', async () => {
    const res = await request(app).post('/api/tournaments/t1/update-rebuys');
    expect(res.statusCode).toBe(200);
  });
});
