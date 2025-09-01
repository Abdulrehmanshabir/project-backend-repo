const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { branchScope } = require('../middleware/branchScope');
const ctrl = require('../controllers/returnsController');

router.use(auth);
router.get('/recent', branchScope, ctrl.recent);
router.post('/', branchScope, ctrl.createReturn);

module.exports = router;

