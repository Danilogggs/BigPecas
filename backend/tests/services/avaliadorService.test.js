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
