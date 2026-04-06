/**
 * mockData.js
 * Dados simulados para a aplicação
 * Futuramente será substituído por dados vindos de API/backend
 */

export const menuItems = [
  { label: 'Catálogo', active: true, icon: 'wrench' },
  { label: 'FAQ', active: false, icon: 'bolt' },
  { label: 'Fornecedores', active: false, icon: 'star' },
];

export const products = [
  {
    name: 'Carburador Weber 40 IDF para Opala 4cc',
    application: 'Opala 4cc 1974–1979',
    price: 'R$ 1.390,00',
    tag: 'Destaque',
    image: '/weber40.png',
  },
  {
    name: 'Jogo de Rodas SS Cromadas 14" para Opala',
    application: 'Opala SS 1978–1984',
    price: 'R$ 4.890,00',
    tag: 'Raro',
    image: '/rodas.png',
  },
  {
    name: 'Painel Original Restaurado para Dodge Charger R/T',
    application: 'Charger R/T 1971–1974',
    price: 'R$ 5.750,00',
    tag: 'Restaurado',
    image: '/interiorcharger.png',
  },
  {
    name: 'Kit Frisos Laterais Inox para Landau',
    application: 'Landau 1976–1980',
    price: 'R$ 2.980,00',
    tag: 'Novo',
    image: '/frisos.png',
  },
];
