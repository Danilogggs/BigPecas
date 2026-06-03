import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="bp-footer">
      <div className="container">
        <div className="bp-footer__grid">
          {/* Brand */}
          <div>
            <div className="bp-footer__brand-name">Big<span>Peças</span></div>
            <p className="bp-footer__tagline">
              Marketplace de peças raras para carros clássicos.<br />
              Catálogo verificado, anúncios curados e procedência garantida.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <div className="bp-footer__col-title">Explorar</div>
            {[
              { label: 'Catálogo de peças', action: () => navigate('/buscaPecas') },
              { label: 'Vender peça',       action: () => navigate('/cadastroPecas') },
              { label: 'Minha conta',       action: () => navigate('/perfil') },
              { label: 'Lista de Desejos',  action: () => navigate('/wish') },
            ].map(({ label, action }) => (
              <button key={label} className="bp-footer__link" onClick={action}>{label}</button>
            ))}
          </div>

          {/* Compras */}
          <div>
            <div className="bp-footer__col-title">Compras</div>
            {[
              { label: 'Carrinho',         action: () => navigate('/carrinho') },
              { label: 'Meus Pedidos',     action: () => navigate('/pedidos') },
              { label: 'Cálculo de Frete', action: () => navigate('/carrinho') },
            ].map(({ label, action }) => (
              <button key={label} className="bp-footer__link" onClick={action}>{label}</button>
            ))}
          </div>

          {/* Suporte */}
          <div>
            <div className="bp-footer__col-title">Suporte</div>
            <span className="bp-footer__link">Sobre o BigPeças</span>
            <span className="bp-footer__link">Política de Privacidade</span>
            <span className="bp-footer__link">Termos de Uso</span>
          </div>
        </div>

        <div className="bp-footer__bottom">
          <span>© {year} BigPeças · EST. 2026 · Nicho Clássico</span>
          <span>
            Frete via{' '}
            <strong style={{ color: 'rgba(255,255,255,.6)' }}>Melhor Envio</strong>{' '}
            · Sandbox
          </span>
        </div>
      </div>
    </footer>
  );
}
