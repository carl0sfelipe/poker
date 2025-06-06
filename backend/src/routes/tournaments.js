const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournaments');
const { auth, checkRole } = require('../middleware/auth');

// Public routes
router.get('/', tournamentController.listTournaments);
router.get('/:id', tournamentController.getTournamentById);

// Protected routes
router.post('/', auth, checkRole(['admin', 'staff']), tournamentController.createTournament);
router.post('/:id/register', auth, tournamentController.registerPlayer);
router.post(
  '/:id/manual-register',
  auth,
  checkRole(['admin', 'staff']),
  tournamentController.manualRegisterPlayer
);
router.post('/:id/checkin', auth, checkRole(['admin', 'staff']), tournamentController.checkInPlayer);
router.post('/:id/eliminate', auth, checkRole(['admin', 'staff']), tournamentController.eliminatePlayer);
router.get('/:id/export', auth, checkRole(['admin', 'staff']), tournamentController.exportTournamentResults);
router.post('/:id/delete', auth, checkRole(['admin', 'staff']), tournamentController.deleteTournament);
router.post('/:id/rebuy', auth, checkRole(['admin', 'staff']), tournamentController.addRebuy);
router.post('/:id/addon', auth, checkRole(['admin', 'staff']), tournamentController.addAddon);
router.post(
  '/:id/settle-payment',
  auth,
  checkRole(['admin', 'staff']),
  tournamentController.settleRegistrationPayment
);
router.post(
  '/:id/update-rebuys',
  auth,
  checkRole(['admin', 'staff']),
  tournamentController.updateRebuyCount
);

module.exports = router;
