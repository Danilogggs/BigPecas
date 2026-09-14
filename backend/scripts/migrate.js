#!/usr/bin/env node
'use strict';

/**
 * Runner de migrations do BigPecas.
 *
 * Usa a MESMA tabela de controle do Supabase CLI
 * (supabase_migrations.schema_migrations), entao `supabase db push` e
 * `npm run migrate` enxergam o mesmo estado e nunca reaplicam uma migration.
 *
 * Comandos:
 *   node scripts/migrate.js status              lista aplicadas/pendentes
 *   node scripts/migrate.js up                  aplica as pendentes (padrao)
 *   node scripts/migrate.js baseline [versao]   marca como aplicadas sem executar
 *   node scripts/migrate.js create <nome>       cria um arquivo novo
 *
 * Conexao: SUPABASE_DB_URL (Dashboard > Settings > Database > Connection string).
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const FILE_PATTERN = /^(\d{14})_([a-z0-9_]+)\.sql$/;

const cores = {
  reset: '\x1b[0m',
  vermelho: '\x1b[31m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  cinza: '\x1b[90m',
};

function log(cor, msg) {
  console.log(`${cores[cor]}${msg}${cores.reset}`);
}

/** Le e valida os arquivos de migration, em ordem de versao. */
function lerMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Diretorio de migrations nao encontrado: ${MIGRATIONS_DIR}`);
  }

  const arquivos = fs.readdirSync(MIGRATIONS_DIR).filter((nome) => nome.endsWith('.sql'));

  const invalidos = arquivos.filter((nome) => !FILE_PATTERN.test(nome));
  if (invalidos.length > 0) {
    throw new Error(
      `Nomes fora do padrao <YYYYMMDDHHMMSS>_<nome_em_snake_case>.sql:\n  ${invalidos.join('\n  ')}`
    );
  }

  const migrations = arquivos
    .map((nome) => {
      const [, version, slug] = FILE_PATTERN.exec(nome);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, nome), 'utf8');
      return {
        version,
        slug,
        nome,
        sql,
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
      };
    })
    .sort((a, b) => a.version.localeCompare(b.version));

  const vistos = new Map();
  for (const m of migrations) {
    if (vistos.has(m.version)) {
      throw new Error(`Versao duplicada ${m.version}: ${vistos.get(m.version)} e ${m.nome}`);
    }
    vistos.set(m.version, m.nome);
  }

  return migrations;
}

function conectar() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error(
      'SUPABASE_DB_URL nao configurada. Copie a connection string em\n' +
        'Supabase Dashboard > Settings > Database > Connection string (URI).'
    );
  }

  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    throw new Error("Dependencia 'pg' ausente. Rode: npm install");
  }

  // Supabase gerenciado exige TLS; instancias locais do CLI nao usam.
  const local = /(^|@)(localhost|127\.0\.0\.1)/.test(connectionString);
  return new Client({
    connectionString,
    ssl: local ? false : { rejectUnauthorized: false },
  });
}

/** Cria a tabela de controle no mesmo formato do Supabase CLI. */
async function garantirLedger(client) {
  await client.query('create schema if not exists supabase_migrations');
  await client.query(`
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    )
  `);
  // Coluna extra, anulavel: permite detectar edicao de migration ja aplicada
  // sem quebrar o Supabase CLI, que ignora colunas que nao conhece.
  await client.query(
    'alter table supabase_migrations.schema_migrations add column if not exists checksum text'
  );
}

async function lerAplicadas(client) {
  const { rows } = await client.query(
    'select version, name, checksum from supabase_migrations.schema_migrations order by version'
  );
  return new Map(rows.map((r) => [r.version, r]));
}

function classificar(migrations, aplicadas) {
  const pendentes = migrations.filter((m) => !aplicadas.has(m.version));
  const alteradas = migrations.filter((m) => {
    const registro = aplicadas.get(m.version);
    return registro && registro.checksum && registro.checksum !== m.checksum;
  });
  return { pendentes, alteradas };
}

function avisarAlteradas(alteradas) {
  if (alteradas.length === 0) return;
  log('amarelo', '\nAviso: migrations ja aplicadas foram editadas depois da aplicacao:');
  for (const m of alteradas) {
    log('amarelo', `  ~ ${m.nome}`);
  }
  log(
    'cinza',
    '  O banco NAO reflete o conteudo atual desses arquivos. Crie uma nova\n' +
      '  migration com a correcao em vez de editar uma ja aplicada.'
  );
}

async function comandoStatus(client) {
  const migrations = lerMigrations();
  const aplicadas = await lerAplicadas(client);
  const { pendentes, alteradas } = classificar(migrations, aplicadas);

  console.log('');
  for (const m of migrations) {
    const marca = aplicadas.has(m.version) ? `${cores.verde}[ok]     ` : `${cores.amarelo}[pendente]`;
    console.log(`${marca}${cores.reset} ${m.nome}`);
  }

  // Registrada no banco mas sem arquivo: sinaliza checkout desatualizado.
  const orfas = [...aplicadas.keys()].filter((v) => !migrations.some((m) => m.version === v));
  if (orfas.length > 0) {
    log('vermelho', `\nAplicadas no banco e ausentes do repositorio: ${orfas.join(', ')}`);
  }

  avisarAlteradas(alteradas);
  console.log(
    `\n${migrations.length} migration(s): ${migrations.length - pendentes.length} aplicada(s), ` +
      `${pendentes.length} pendente(s).\n`
  );
  return pendentes.length;
}

async function comandoUp(client) {
  const migrations = lerMigrations();
  const aplicadas = await lerAplicadas(client);
  const { pendentes, alteradas } = classificar(migrations, aplicadas);

  avisarAlteradas(alteradas);

  if (pendentes.length === 0) {
    log('verde', 'Banco atualizado: nenhuma migration pendente.');
    return;
  }

  log('cinza', `Aplicando ${pendentes.length} migration(s)...\n`);

  for (const m of pendentes) {
    const inicio = Date.now();
    // Uma transacao por migration: falha no meio nao deixa schema pela metade.
    await client.query('begin');
    try {
      await client.query(m.sql);
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, name, statements, checksum)
         values ($1, $2, $3, $4)`,
        [m.version, m.slug, [m.sql], m.checksum]
      );
      await client.query('commit');
      log('verde', `  ok  ${m.nome} ${cores.cinza}(${Date.now() - inicio}ms)`);
    } catch (erro) {
      await client.query('rollback');
      log('vermelho', `  falhou  ${m.nome}`);
      log('vermelho', `  ${erro.message}`);
      throw new Error(`Migration ${m.nome} falhou; nenhuma alteracao dela foi mantida.`);
    }
  }

  log('verde', `\n${pendentes.length} migration(s) aplicada(s).`);
}

/**
 * Marca migrations como aplicadas sem executa-las. Necessario em bancos que ja
 * receberam esses scripts manualmente pelo SQL Editor.
 */
async function comandoBaseline(client, ate) {
  const migrations = lerMigrations();
  const aplicadas = await lerAplicadas(client);

  if (ate && !migrations.some((m) => m.version === ate)) {
    throw new Error(`Versao ${ate} nao existe em supabase/migrations/.`);
  }

  const alvo = migrations.filter((m) => !aplicadas.has(m.version) && (!ate || m.version <= ate));

  if (alvo.length === 0) {
    log('verde', 'Nada a registrar: as migrations selecionadas ja constam como aplicadas.');
    return;
  }

  log('amarelo', 'Registrando como aplicadas SEM executar o SQL:');
  for (const m of alvo) {
    console.log(`  - ${m.nome}`);
  }

  await client.query('begin');
  try {
    for (const m of alvo) {
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, name, statements, checksum)
         values ($1, $2, $3, $4)
         on conflict (version) do nothing`,
        [m.version, m.slug, [m.sql], m.checksum]
      );
    }
    await client.query('commit');
  } catch (erro) {
    await client.query('rollback');
    throw erro;
  }

  log('verde', `\n${alvo.length} migration(s) registrada(s). Confira com: npm run migrate:status`);
}

function comandoCreate(nome) {
  if (!nome) {
    throw new Error('Informe o nome: npm run migrate:create -- <nome_da_migration>');
  }

  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!slug) {
    throw new Error(`Nome invalido: ${nome}`);
  }

  const agora = new Date();
  const version = [
    agora.getUTCFullYear(),
    String(agora.getUTCMonth() + 1).padStart(2, '0'),
    String(agora.getUTCDate()).padStart(2, '0'),
    String(agora.getUTCHours()).padStart(2, '0'),
    String(agora.getUTCMinutes()).padStart(2, '0'),
    String(agora.getUTCSeconds()).padStart(2, '0'),
  ].join('');

  const destino = path.join(MIGRATIONS_DIR, `${version}_${slug}.sql`);
  fs.writeFileSync(
    destino,
    `-- ${slug}\n` +
      `-- Criada em ${agora.toISOString()}\n` +
      '--\n' +
      '-- O runner abre a transacao: nao escreva begin/commit aqui.\n' +
      '-- Prefira comandos idempotentes (if not exists / if exists).\n' +
      '-- Migration aplicada nao se edita: corrija criando outra.\n\n',
    'utf8'
  );

  log('verde', `Criada: supabase/migrations/${path.basename(destino)}`);
}

async function main() {
  const [comando = 'up', argumento] = process.argv.slice(2);

  if (comando === 'create') {
    comandoCreate(argumento);
    return;
  }

  if (!['up', 'status', 'baseline'].includes(comando)) {
    throw new Error(`Comando desconhecido: ${comando}. Use up, status, baseline ou create.`);
  }

  const client = conectar();
  await client.connect();
  try {
    await garantirLedger(client);
    if (comando === 'status') await comandoStatus(client);
    else if (comando === 'up') await comandoUp(client);
    else await comandoBaseline(client, argumento);
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  log('vermelho', `\n${erro.message}\n`);
  process.exit(1);
});
