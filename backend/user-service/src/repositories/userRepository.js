const { pool } = require('../config/db');

async function create(user) {
  const sql = `
    INSERT INTO users (email, password_hash, full_name, gender, cep)
    VALUES (?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    user.email,
    user.password_hash,
    user.full_name,
    user.gender,
    user.cep
  ]);

  return result.insertId;
}

async function findAll() {
  const [rows] = await pool.execute(`
    SELECT id, email, full_name, gender, cep, created_at, updated_at
    FROM users
    ORDER BY id DESC
  `);

  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT id, email, full_name, gender, cep, created_at, updated_at
     FROM users
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, email, password_hash, full_name, gender, cep, created_at, updated_at
     FROM users
     WHERE email = ?`,
    [email]
  );

  return rows[0] || null;
}

async function update(id, user) {
  const sql = `
    UPDATE users
    SET email = ?, full_name = ?, gender = ?, cep = ?
    WHERE id = ?
  `;

  const [result] = await pool.execute(sql, [
    user.email,
    user.full_name,
    user.gender,
    user.cep,
    id
  ]);

  return result.affectedRows;
}

async function updatePassword(id, passwordHash) {
  const [result] = await pool.execute(
    `UPDATE users SET password_hash = ? WHERE id = ?`,
    [passwordHash, id]
  );

  return result.affectedRows;
}

async function remove(id) {
  const [result] = await pool.execute(
    `DELETE FROM users WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
}

module.exports = {
  create,
  findAll,
  findById,
  findByEmail,
  update,
  updatePassword,
  remove
};
