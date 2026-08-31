// Executar: node --test backend/scripts/review-regression.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { montarPayloadPeca, sanitizarAtualizacao } = require('../src/modules/pecas/domain/peca');
const usuario = require('../src/modules/usuarios/domain/usuario');
const { validarRespostas, validarCriterio } = require('../src/services/reviewValidation');
const criarPecasUseCases = require('../src/modules/pecas/application/criarPecasUseCases');
const criarRepository = require('../src/modules/pecas/infrastructure/SupabasePecasRepository');
function loadWithDb(file, db) {
  const original = Module._load;
  Module._load = function(name, ...args) {
    if (name.endsWith('/config/supabaseClient')) return { supabaseAdmin: db };
    return original.call(this, name, ...args);
  };
  try { delete require.cache[require.resolve(file)]; return require(file); }
  finally { Module._load = original; }
}
function fakeDb(rows = []) {
  const calls = [];
  const query = new Proxy({}, { get: (_, method) => method === 'then'
    ? (resolve, reject) => Promise.resolve({ data: rows, error: null }).then(resolve,reject)
    : (...args) => { calls.push([method, ...args]); return query; } });
  return { calls, from: (...args) => { calls.push(['from', ...args]); return query; } };
}
test('cadastro ignora tentativa de publicar ou falsificar resultado da API', () => {
  const p = montarPayloadPeca({ nome_peca:'Motor', preco:'99.50', status_publicacao:'publicada',
    status_api_serie:'aprovada', moeda_base:'USD', url_video:'https://example.test/video.mp4' }, 5);
  assert.equal(p.status_publicacao,'pendente_validacao');
  assert.equal(p.preco_base,99.5); assert.equal(p.moeda_base,'USD');
  assert.equal(p.status_api_serie,undefined);
});
test('edição permite mídia/preço base, mas nunca estado, revisão ou API', () => {
  assert.deepEqual(sanitizarAtualizacao({ preco:'12.50', url_video:'https://example.test/a.webm',
    status_publicacao:'publicada', revisao_avaliacao:42, dados_api_validacao:{} }),
    { preco_base:12.5, url_video:'https://example.test/a.webm' });
  assert.throws(() => sanitizarAtualizacao({url_video:'javascript:alert(1)'}));
  assert.throws(() => sanitizarAtualizacao({preco:Infinity}));
});
test('checklist rejeita booleanos em texto, IDs duplicados e critérios inválidos', () => {
  assert.throws(() => validarRespostas([{criterio_id:1,resposta:'true'}]));
  assert.throws(() => validarRespostas([{criterio_id:1,resposta:true},{criterio_id:'1',resposta:false}]));
  assert.throws(() => validarRespostas(null));
  assert.throws(() => validarCriterio({nome_criterio:' ',ativo:true,obrigatorio:true,ordem:0}));
  assert.throws(() => validarCriterio({nome_criterio:'Real?',ativo:true,obrigatorio:true,ordem:-1}));
  assert.equal(validarRespostas([{criterio_id:1,resposta:false}]).length,1);
});
test('perfil avaliador é persistido e normalizado; admin nunca vem do cadastro', () => {
  assert.equal(usuario.sanitizarCadastro({tipo_usuario:'avaliador'}).tipo_usuario,'avaliador');
  assert.equal(usuario.normalizarPerfil({tipo_usuario:'avaliador'}).tipo_usuario,'avaliador');
  assert.equal(usuario.sanitizarCadastro({tipo_usuario:'admin',is_admin:true}).tipo_usuario,'ambos');
  assert.equal(usuario.sanitizarCadastro({is_admin:true}).is_admin,undefined);
});
test('anúncio pendente só pode ser detalhado pelo proprietário', async () => {
  const peca={id:1, fornecedor_id:5,status_publicacao:'pendente_validacao'};
  const cases=criarPecasUseCases({repository:{
    buscarPecaPorId:async()=>peca, buscarFornecedorPorEmail:async email=>({id:email==='dono@test'?5:6})
  }});
  await assert.rejects(cases.detalhar(1), {statusCode:404});
  await assert.rejects(cases.detalhar(1,{email:'outro@test'}), {statusCode:404});
  assert.equal(await cases.detalhar(1,{email:'dono@test'}),peca);
  await assert.rejects(cases.recomendar(1,4), {statusCode:404});
});
test('catálogo usa view publicada e preço convertido; área do dono usa peças', async () => {
  const db=fakeDb([]); const repo=criarRepository({supabase:db,tabelas:{pecas:'pecas'}});
  const filters={fornecedorAtualId:null,fornecedorId:null,categoriaId:null,materialId:null,
    precoMinimo:10,precoMaximo:20,estoqueMinimo:null,moeda:'EUR'};
  await repo.listarPecas({filtros:filters,ordenacao:{campo:'preco',ascendente:true},paginacao:{inicio:0,fim:19}});
  assert.ok(db.calls.some(c=>c[0]==='from'&&c[1]==='precos_publicos_moeda'));
  assert.ok(db.calls.some(c=>c[0]==='gte'&&c[1]==='preco_exibicao'&&c[2]===10));
  db.calls.length=0;
  await repo.listarPecas({filtros:{...filters,fornecedorAtualId:5},ordenacao:{campo:'id'},paginacao:{inicio:0,fim:19}});
  assert.ok(db.calls.some(c=>c[0]==='from'&&c[1]==='pecas'));
  assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='fornecedor_id'&&c[2]===5));
});
test('conversão cruzada preserva zero e rejeita moeda desconhecida', async () => {
  const service=loadWithDb('../src/services/currencyService',fakeDb([
    {moeda:'BRL',unidades_por_brl:1},{moeda:'USD',unidades_por_brl:0.2},{moeda:'EUR',unidades_por_brl:0.16}
  ]));
  assert.equal(await service.convert(10,'USD','EUR'),8);
  assert.equal(await service.convert(0,'USD','EUR'),0);
  await assert.rejects(service.convert(10,'ZZZ','BRL'),{statusCode:400});
  await assert.rejects(service.convert(-1,'BRL','USD'),{statusCode:400});
  const categories=await service.categories('USD');
  assert.equal(categories[0].valor_maximo,100);
  assert.equal(categories[2].valor_maximo,null);
});
test('middleware resolve UUID de autenticação para ID bigint do perfil', async () => {
  const db=fakeDb({id:17,tipo_usuario:'avaliador',is_admin:false});
  const {verifyAvaliador}=loadWithDb('../src/middlewares/verifyAvaliador',db);
  const req={user:{id:'auth-uuid',email:'Pessoa@Test'}};
  let error;
  await verifyAvaliador(req,{},e=>{error=e;});
  assert.equal(error,undefined); assert.equal(req.avaliador.id,17);
  assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='email'&&c[2]==='pessoa@test'));
});
test('usuário comum não passa pelo middleware de avaliação', async () => {
  const {verifyAvaliador}=loadWithDb('../src/middlewares/verifyAvaliador',fakeDb({id:2,tipo_usuario:'ambos',is_admin:false}));
  let error; await verifyAvaliador({user:{email:'x@test'}},{},e=>{error=e;});
  assert.equal(error.statusCode,403);
});

