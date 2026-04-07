const { body, param } = require('express-validator');

const idParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Informe um identificador válido.')
];

const createUserValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Informe o e-mail.')
    .isEmail()
    .withMessage('Informe um e-mail válido.')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('A senha deve ter pelo menos 8 caracteres.'),

  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Informe o nome completo.')
    .isLength({ min: 3, max: 150 })
    .withMessage('O nome completo deve ter entre 3 e 150 caracteres.'),

  body('gender')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('O campo gênero pode ter no máximo 30 caracteres.'),

  body('cep')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('Informe um CEP válido no formato 99999-999 ou 99999999.')
];

const updateUserValidator = [
  ...idParamValidator,

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Informe o e-mail.')
    .isEmail()
    .withMessage('Informe um e-mail válido.')
    .normalizeEmail(),

  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Informe o nome completo.')
    .isLength({ min: 3, max: 150 })
    .withMessage('O nome completo deve ter entre 3 e 150 caracteres.'),

  body('gender')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('O campo gênero pode ter no máximo 30 caracteres.'),

  body('cep')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('Informe um CEP válido no formato 99999-999 ou 99999999.')
];

const updatePasswordValidator = [
  ...idParamValidator,
  body('password')
    .isLength({ min: 8 })
    .withMessage('A senha deve ter pelo menos 8 caracteres.')
];

module.exports = {
  idParamValidator,
  createUserValidator,
  updateUserValidator,
  updatePasswordValidator
};
