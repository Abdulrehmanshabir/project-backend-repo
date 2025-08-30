const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { branchScope } = require('../middleware/branchScope');
const ctrl = require('../controllers/reportsController');

router.use(auth);
router.get('/low-stock', branchScope, ctrl.lowStock);
router.get('/daily-sales', branchScope, ctrl.dailySales);
router.get('/analytics', branchScope, ctrl.analytics);
router.get('/analytics/overview', ctrl.overview);
router.get('/investments', branchScope, ctrl.listInvestments);
router.post('/investments', branchScope, ctrl.addInvestment);
router.get('/expenses', branchScope, ctrl.listExpenses);
router.post('/expenses', branchScope, ctrl.addExpense);

module.exports = router;
