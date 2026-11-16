const { lerMigrations, sqlParaExecucao } = require('../../scripts/migrate');

test('aceita a migration historica sem renomear a versao nem alterar seu checksum', () => {
  const migrations = lerMigrations();
  const legacy = migrations.find((m) => m.version === '20260914');
  expect(legacy).toBeDefined();
  expect(legacy.sql).toMatch(/^BEGIN;\r?$/m);
  const executavel = sqlParaExecucao(legacy);
  expect(executavel).not.toMatch(/^(BEGIN|COMMIT);\r?$/m);
  expect(legacy.sql).toMatch(/^COMMIT;\r?$/m);
  expect(migrations.at(-1).slug).toBe('relatorios_agrupados');
  expect(sqlParaExecucao(migrations.at(-1))).toBe(migrations.at(-1).sql);
});
