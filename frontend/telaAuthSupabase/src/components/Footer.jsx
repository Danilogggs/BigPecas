import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bp-footer">
      <div className="container">
        <div className="bp-footer__grid">
          {/* Brand */}
          <div>
            <div className="bp-footer__brand-name">Big<span>Peças</span></div>
            <p className="bp-footer__tagline">
              {t('marketplaceTag')} para carros clássicos.<br />
              {t('verifiedListings')}, anúncios curados e procedência garantida.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <div className="bp-footer__col-title">{t('explore')}</div>
            {[
              { label: t('catalog'), action: () => navigate('/buscaPecas') },
              { label: t('sellPart'), action: () => navigate('/cadastroPecas') },
              { label: t('myAccount'), action: () => navigate('/perfil') },
              { label: t('wishlist'), action: () => navigate('/wish') },
            ].map(({ label, action }) => (
              <button key={label} className="bp-footer__link" onClick={action}>{label}</button>
            ))}
          </div>

          {/* Compras */}
          <div>
            <div className="bp-footer__col-title">{t('purchases')}</div>
            {[
              { label: t('cart'), action: () => navigate('/carrinho') },
              { label: t('myOrders'), action: () => navigate('/pedidos') },
              { label: t('shippingCalculation'), action: () => navigate('/carrinho') },
            ].map(({ label, action }) => (
              <button key={label} className="bp-footer__link" onClick={action}>{label}</button>
            ))}
          </div>

          {/* Suporte */}
          <div>
            <div className="bp-footer__col-title">{t('support')}</div>
            <span className="bp-footer__link">{t('about')}</span>
            <span className="bp-footer__link">{t('privacy')}</span>
            <span className="bp-footer__link">{t('terms')}</span>
          </div>
        </div>

        <div className="bp-footer__bottom">
          <span>© {year} BigPeças · EST. 2026 · Nicho Clássico</span>
        </div>
      </div>
    </footer>
  );
}
