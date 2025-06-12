const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', tournamentController.list);
router.get('/:id', tournamentController.getById);

// Protected routes
router.post('/', auth, checkRole(['admin', 'staff']), tournamentController.create);
router.post('/:id/register', auth, tournamentController.register);
router.post(
  '/:id/manual-register',
  auth,
  checkRole(['admin', 'staff']),
  tournamentController.manualRegister
);
router.post('/:id/checkin', auth, checkRole(['admin', 'staff']), tournamentController.checkIn);
router.post('/:id/eliminate', auth, checkRole(['admin', 'staff']), tournamentController.eliminate);
router.get('/:id/export', auth, checkRole(['admin', 'staff']), tournamentController.exportResults);
router.post('/:id/delete', auth, checkRole(['admin', 'staff']), tournamentController.delete);
router.delete('/:id', auth, checkRole(['admin', 'staff']), tournamentController.delete);
router.post('/:id/rebuy', auth, checkRole(['admin', 'staff']), tournamentController.addRebuy);
router.post('/:id/addon', auth, checkRole(['admin', 'staff']), tournamentController.addAddon);
router.post(
  '/:id/settle-payment',
  auth,
  checkRole(['admin', 'staff']),
  tournamentController.settlePayment
);
router.post(
  '/:id/update-rebuys',
  auth,
  checkRole(['admin', 'staff']),
  tournamentController.updateRebuyCount
);

module.exports = router;
