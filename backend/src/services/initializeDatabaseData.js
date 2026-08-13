const { supabaseAdmin } = require('../config/supabaseClient');
const logger = require('../utils/logger');

const CATEGORIAS_TABLE = process.env.SUPABASE_CATEGORIAS_TABLE || 'categorias';
const MATERIAIS_TABLE = process.env.SUPABASE_MATERIAIS_TABLE || 'materiais';

async function seedTableIfEmpty(tableName, rows, label) {
  const { count, error: countError } = await supabaseAdmin
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  if (count === 0) {
    const { error: insertError } = await supabaseAdmin.from(tableName).insert(rows);
    if (insertError) throw insertError;
    logger.info(`${label} inseridos no Supabase`);
  }
}

async function initializeDatabaseData() {
  try {
    logger.info('Verificando dados padrao no Supabase...');

    await seedTableIfEmpty(CATEGORIAS_TABLE, [
      { nome: 'Motor' },
      { nome: 'Lataria' },
      { nome: 'Elétrica' },
      { nome: 'Interior' },
      { nome: 'Suspensão' },
      { nome: 'Freios' },
    ], 'Categorias padrao');

    await seedTableIfEmpty(MATERIAIS_TABLE, [
      { nome: 'Aço' },
      { nome: 'Antimônio' },
      { nome: 'Baquelite' },
      { nome: 'Cromo' },
      { nome: 'Alumínio' },
      { nome: 'Borracha' },
    ], 'Materiais padrao');

    logger.info('Dados padrao do Supabase verificados com sucesso');
  } catch (error) {
    logger.warn('Nao foi possivel inicializar dados padrao', { error: error.message });
  }
}

module.exports = initializeDatabaseData;
