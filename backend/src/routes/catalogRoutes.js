const express = require('express');

const { supabaseAdmin } = require('../config/supabaseClient');

const router = express.Router();
const CATEGORIAS_TABLE = process.env.SUPABASE_CATEGORIAS_TABLE || 'categorias';
const MATERIAIS_TABLE = process.env.SUPABASE_MATERIAIS_TABLE || 'materiais';

router.get('/categorias', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(CATEGORIAS_TABLE)
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

router.get('/materiais', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(MATERIAIS_TABLE)
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
