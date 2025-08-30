const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { branchScope } = require('../middleware/branchScope');
const ctrl = require('../controllers/stockController');

router.use(auth);
router.get('/', branchScope, ctrl.byBranch);
// legacy alias for clients using /list
router.get('/list', branchScope, ctrl.byBranch);
// support both PATCH and POST for adjust to avoid client mismatch
router.patch('/adjust', branchScope, ctrl.adjust);
router.post('/adjust', branchScope, ctrl.adjust);

module.exports = router;
