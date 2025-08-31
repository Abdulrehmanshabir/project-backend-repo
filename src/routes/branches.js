const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const ctrl = require('../controllers/branchController');

router.use(auth);

router.get('/', ctrl.list);
router.get('/with-managers', requireAdmin, ctrl.listWithManagers);
router.post('/', requireAdmin, ctrl.create);
router.patch('/:code/assign', requireAdmin, ctrl.assignManager);
router.patch('/:code/unassign', requireAdmin, ctrl.unassignManager);

module.exports = router;
