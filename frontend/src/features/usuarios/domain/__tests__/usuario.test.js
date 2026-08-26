import {
  criarEstadoPerfil,
  formatarCepPerfil,
  formatarTelefonePerfil,
  normalizarEmailUsuario,
  perfilPodeVender,
  validarPerfilUsuario,
} from '../usuario';

describe('domínio de usuários', () => {
  it('normaliza email, CEP e telefone', () => {
    expect(normalizarEmailUsuario(' Cliente@Email.COM ')).toBe('cliente@email.com');
    expect(formatarCepPerfil('80000123')).toBe('80000-123');
    expect(formatarTelefonePerfil('41999998888')).toBe('(41) 99999-8888');
  });

  it('cria estado seguro e identifica vendedor habilitado', () => {
    const perfil = criarEstadoPerfil({ full_name: 'Maria Silva', receber_email_notificacao_venda: false });
    expect(perfil.tipo_usuario).toBe('ambos');
    expect(perfil.receber_email_notificacao_venda).toBe(false);
    expect(perfilPodeVender({ email_verificado: true, nome_loja: 'Loja', descricao_loja: 'Peças' })).toBe(true);
  });

  it('valida dados pessoais e dados incompletos da loja', () => {
    const erros = validarPerfilUsuario(criarEstadoPerfil({ nome_loja: 'Loja' }));
    expect(erros).toMatchObject({
      full_name: expect.any(String), cep: expect.any(String), telefone: expect.any(String),
      descricao_loja: expect.any(String),
    });
  });
});
