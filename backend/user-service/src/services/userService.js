const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const ApiError = require('../utils/ApiError');

async function createUser(data) {
  const existingUser = await userRepository.findByEmail(data.email);

  if (existingUser) {
    throw new ApiError(409, 'E-mail já cadastrado.');
  }

  const password_hash = await bcrypt.hash(data.password, 10);

  const userId = await userRepository.create({
    email: data.email,
    password_hash,
    full_name: data.full_name,
    gender: data.gender || null,
    cep: data.cep || null
  });

  return userRepository.findById(userId);
}

async function getAllUsers() {
  return userRepository.findAll();
}

async function getUserById(id) {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new ApiError(404, 'Usuário não encontrado.');
  }

  return user;
}

async function updateUser(id, data) {
  const currentUser = await userRepository.findById(id);

  if (!currentUser) {
    throw new ApiError(404, 'Usuário não encontrado.');
  }

  const userWithSameEmail = await userRepository.findByEmail(data.email);

  if (userWithSameEmail && Number(userWithSameEmail.id) !== Number(id)) {
    throw new ApiError(409, 'Já existe outro usuário com este e-mail.');
  }

  await userRepository.update(id, {
    email: data.email,
    full_name: data.full_name,
    gender: data.gender || null,
    cep: data.cep || null
  });

  return userRepository.findById(id);
}

async function updateUserPassword(id, password) {
  const currentUser = await userRepository.findById(id);

  if (!currentUser) {
    throw new ApiError(404, 'Usuário não encontrado.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await userRepository.updatePassword(id, passwordHash);

  return {
    message: 'Senha atualizada com sucesso.'
  };
}

async function deleteUser(id) {
  const currentUser = await userRepository.findById(id);

  if (!currentUser) {
    throw new ApiError(404, 'Usuário não encontrado.');
  }

  await userRepository.remove(id);

  return {
    message: 'Usuário removido com sucesso.'
  };
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserPassword,
  deleteUser
};
