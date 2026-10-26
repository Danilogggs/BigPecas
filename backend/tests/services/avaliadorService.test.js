jest.mock('../../src/config/supabaseClient', () => ({ supabaseAdmin: { from: jest.fn(), rpc: jest.fn() } }));
const { supabaseAdmin: db } = require('../../src/config/supabaseClient');
const service = require('../../src/services/avaliadorService');
const answers = [{ criterio_id: 1, resposta: true }];
beforeEach(() => { jest.clearAllMocks(); db.rpc.mockResolvedValue({data:{publicada:true},error:null}); });
function piece(data) {
  const chain = {select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),maybeSingle:jest.fn().mockResolvedValue({data,error:null})};
  db.from.mockReturnValue(chain);
}
test.each([{}, {imagem:' ',url_video:''}])('nega aprovação sem mídia: %j', async media => {
  piece({revisao_avaliacao:1,...media});
  await expect(service.decidir(1,2,answers,'',1,false)).rejects.toThrow('imagem ou vídeo');
  expect(db.rpc).not.toHaveBeenCalled();
});
test.each([{imagem:'https://example.com/peca.jpg'}, {url_video:'https://example.com/peca.mp4'}])('permite decisão com mídia: %j', async media => {
  piece({revisao_avaliacao:1,...media});
  await expect(service.decidir(1,2,answers,'',1,false)).resolves.toEqual({publicada:true});
  expect(db.rpc).toHaveBeenCalledTimes(1);
});
test('não impede reprovar anúncio sem mídia', async () => {
  await service.decidir(1,2,answers,'Falta imagem',1,true);
  expect(db.from).not.toHaveBeenCalled();
  expect(db.rpc).toHaveBeenCalledTimes(1);
});
test('revisão desatualizada não publica', async () => {
  piece({revisao_avaliacao:2,imagem:'https://example.com/p.jpg'});
  await expect(service.decidir(1,2,answers,'',1,false)).rejects.toThrow('anúncio mudou');
  expect(db.rpc).not.toHaveBeenCalled();
});

test('avaliação pendente preserva o snapshot, mas remove critério que foi inativado', async () => {
  const resultados = [
    { data: { id: 10, status_publicacao: 'pendente_validacao', revisao_avaliacao: 3 }, error: null },
    { data: { revisao: 3, criterios_snapshot: [
      { id: 1, nome_criterio: 'Peça real?', obrigatorio: true },
      { id: 2, nome_criterio: 'Critério desativado', obrigatorio: true },
    ] }, error: null },
    { data: [
      { id: 1, nome_criterio: 'Texto atual não substitui o snapshot', obrigatorio: true, ativo: true },
      { id: 3, nome_criterio: 'Criado depois', obrigatorio: true, ativo: true },
    ], error: null },
  ];
  db.from.mockImplementation(() => {
    const resultado = resultados.shift();
    const chain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis() };
    chain.then = (resolve) => Promise.resolve(resultado).then(resolve);
    return chain;
  });

  const retorno = await service.getValidacaoPeca(10);

  expect(retorno.criterios).toEqual([
    { id: 1, nome_criterio: 'Peça real?', obrigatorio: true },
  ]);
});
