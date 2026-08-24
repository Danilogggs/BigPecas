/**
 * O Vite resolve `import.meta.env` na hora do build, mas o Jest transpila os
 * modulos para CommonJS, onde `import.meta` nem sequer e sintaxe valida.
 *
 * Este plugin troca `import.meta` por um objeto global que o setup dos testes
 * preenche (`jest/setupTests.js`), permitindo testar os modulos reais em vez de
 * substituir `apiConfig`/`supabase` por dublês.
 */
module.exports = function babelPluginImportMeta({ types: t }) {
  return {
    name: 'transform-import-meta-to-global',
    visitor: {
      MetaProperty(path) {
        path.replaceWith(t.identifier('__VITE_IMPORT_META__'));
      },
    },
  };
};
