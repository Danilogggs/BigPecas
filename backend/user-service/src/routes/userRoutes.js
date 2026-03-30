const express = require('express');
const userController = require('../controllers/userController');
const validateRequest = require('../middlewares/validateRequest');
const {
  idParamValidator,
  createUserValidator,
  updateUserValidator,
  updatePasswordValidator
} = require('../validators/userValidator');

const router = express.Router();

router.post('/', createUserValidator, validateRequest, userController.create);
router.get('/', userController.findAll);
router.get('/:id', idParamValidator, validateRequest, userController.findById);
router.put('/:id', updateUserValidator, validateRequest, userController.update);
router.patch('/:id/password', updatePasswordValidator, validateRequest, userController.updatePassword);
router.delete('/:id', idParamValidator, validateRequest, userController.remove);

module.exports = router;
