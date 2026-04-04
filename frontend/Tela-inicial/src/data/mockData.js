/**
 * mockData.js
 *
 * Arquivo responsável por simular dados da aplicação.
 *
 * Contém informações estáticas como:
 * - Lista de produtos
 * - Itens do menu
 *
 * Futuramente será substituído por dados vindos de API/backend.
 */
import weberImg from "../assets/weber40.png";
import rodasimg from "../assets/rodas.png";
import interiorcharger from "../assets/interiorcharger.png";
import frisos from "../assets/frisos.png";



export const menuItems = [
  { label: "Catálogo", active: true, icon: "wrench" },
  { label: "FAQ", active: false, icon: "bolt" },
  { label: "Fornecedores", active: false, icon: "star" },
];

export const products = [
  {
    name: "Carburador Weber 40 IDF para Opala 4cc",
    application: "Opala 4cc 1974–1979",
    price: "R$ 1.390,00",
    tag: "Destaque",
    image: weberImg,
  },
  {
    name: "Jogo de Rodas SS Cromadas 14” para Opala",
    application: "Opala SS 1978–1984",
    price: "R$ 4.890,00",
    tag: "Raro",
    image: rodasimg,
  },
  {
    name: "Painel Original Restaurado para Dodge Charger R/T",
    application: "Charger R/T 1971–1974",
    price: "R$ 5.750,00",
    tag: "Restaurado",

    image: interiorcharger,
  },
  {
    name: "Kit Frisos Laterais Inox para Landau",
    application: "Landau 1976–1980",
    price: "R$ 2.980,00",
    tag: "Novo",
    image: frisos,
  },
];