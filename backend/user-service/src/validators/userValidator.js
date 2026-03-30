const { body, param } = require('express-validator');

const idParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('O parâmetro id deve ser um número inteiro positivo.')
];

const createUserValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-mail é obrigatório.')
    .isEmail()
    .withMessage('E-mail inválido.')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('A senha deve ter no mínimo 8 caracteres.'),

  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Nome completo é obrigatório.')
    .isLength({ min: 3, max: 150 })
    .withMessage('Nome completo deve ter entre 3 e 150 caracteres.'),

  body('gender')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Gênero deve ter no máximo 30 caracteres.'),

  body('cep')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP inválido. Use 99999-999 ou 99999999.')
];

const updateUserValidator = [
  ...idParamValidator,

  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-mail é obrigatório.')
    .isEmail()
    .withMessage('E-mail inválido.')
    .normalizeEmail(),

  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Nome completo é obrigatório.')
    .isLength({ min: 3, max: 150 })
    .withMessage('Nome completo deve ter entre 3 e 150 caracteres.'),

  body('gender')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Gênero deve ter no máximo 30 caracteres.'),

  body('cep')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP inválido. Use 99999-999 ou 99999999.')
];

const updatePasswordValidator = [
  ...idParamValidator,
  body('password')
    .isLength({ min: 8 })
    .withMessage('A senha deve ter no mínimo 8 caracteres.')
];

module.exports = {
  idParamValidator,
  createUserValidator,
  updateUserValidator,
  updatePasswordValidator
};
