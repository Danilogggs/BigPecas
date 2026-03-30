const userService = require('../services/userService');

async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);

    return res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

async function findAll(req, res, next) {
  try {
    const users = await userService.getAllUsers();

    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    return next(error);
  }
}

async function findById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePassword(req, res, next) {
  try {
    const result = await userService.updateUserPassword(req.params.id, req.body.password);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await userService.deleteUser(req.params.id);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  updatePassword,
  remove
};
