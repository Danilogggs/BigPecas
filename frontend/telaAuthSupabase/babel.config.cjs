// Usado apenas pelo Jest — o build de producao continua sendo feito pelo Vite.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: ['./jest/babel-plugin-import-meta.cjs'],
};
