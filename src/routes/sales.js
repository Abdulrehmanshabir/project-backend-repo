const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { branchScope } = require('../middleware/branchScope');
const ctrl = require('../controllers/salesController');

router.use(auth);
router.get('/recent', require('../middleware/branchScope').branchScope, ctrl.recent);
router.post('/', branchScope, ctrl.createSale);

module.exports = router;
