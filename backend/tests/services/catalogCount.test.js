const createRepository = require('../../src/modules/pecas/infrastructure/SupabasePecasRepository');
test.each([0,1,30])('solicita contagem exata e preserva total %i', async total => {
  const chain = {select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),
    range:jest.fn().mockResolvedValue({data:total ? [{id:1}] : [],count:total,error:null})};
  const repository = createRepository({supabase:{from:jest.fn().mockReturnValue(chain)},tabelas:{pecas:'pecas'}});
  const result = await repository.listarPecas({filtros:{fornecedorId:null,categoriaId:null,materialId:null,precoMinimo:null,precoMaximo:null,estoqueMinimo:null},
    ordenacao:{campo:'preco',ascendente:true},paginacao:{inicio:0,fim:23}});
  expect(chain.select).toHaveBeenCalledWith('*',{count:'exact'});
  expect(result.total).toBe(total);
});
