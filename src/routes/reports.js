const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { branchScope } = require('../middleware/branchScope');
const ctrl = require('../controllers/reportsController');

router.use(auth);
router.get('/low-stock', branchScope, ctrl.lowStock);
router.get('/daily-sales', branchScope, ctrl.dailySales);
router.get('/daily-transactions', branchScope, ctrl.dailyTransactions);
router.get('/range-transactions', branchScope, ctrl.rangeTransactions);
router.get('/analytics', branchScope, ctrl.analytics);
router.get('/range-analytics', branchScope, ctrl.rangeAnalytics);
router.get('/analytics/overview', ctrl.overview);
router.get('/investments', branchScope, ctrl.listInvestments);
router.post('/investments', branchScope, ctrl.addInvestment);
router.get('/expenses', branchScope, ctrl.listExpenses);
router.post('/expenses', branchScope, ctrl.addExpense);
router.get('/expenses/summary', branchScope, ctrl.expensesSummary);
router.get('/expenses/by-user', branchScope, ctrl.expensesByUser);
router.get('/expenses/by-branch', branchScope, ctrl.expensesByBranch);
router.get('/expenses/summary-by-branch', ctrl.expensesSummaryByBranch);

module.exports = router;
