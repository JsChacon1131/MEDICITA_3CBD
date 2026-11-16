const express = require('express');
const { authenticate } = require('../middleware/authentication');
const { requireAdmin } = require('../middleware/authorization');
const controller = require('../controllers/finance.controller');

const router = express.Router();
router.use(authenticate, requireAdmin);
router.get('/finance', controller.report);
router.get('/appointments-today', controller.today);
module.exports = router;
