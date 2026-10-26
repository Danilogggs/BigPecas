import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

// O Supabase redireciona para ca depois do clique no link de confirmacao.
// Quando o link ja foi usado (ex.: o provedor de e-mail abriu o link para
// verificar seguranca antes do usuario), ele volta com `error_code` no hash,
// mas o cadastro ja esta confirmado: basta entrar.
function lerErro({ hash, search }) {
  const parametros = new URLSearchParams(hash.replace(/^#/, ''));
  new URLSearchParams(search).forEach((valor, chave) => parametros.set(chave, valor));
  return parametros.get('error_code') || parametros.get('error') || '';
}

export default function EmailConfirmadoPage() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const erro = lerErro(location);
  const logado = !loading && Boolean(user);

  return (
    <div className="auth-layout" style={{ gridTemplateColumns: '1fr' }}>
      <LanguageSwitcher className="auth-language-switcher" />
      <div className="auth-panel-right">
        <div className="auth-form-card" role="status">
          <p className="auth-form-tag">{t('emailConfirmationTag')}</p>
          <h1 className="auth-form-title">
            {erro ? t('emailLinkAlreadyUsedTitle') : t('emailConfirmedTitle')}
          </h1>
          <p style={{ color: 'var(--bp-text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            {erro ? t('emailLinkAlreadyUsedDescription') : t('emailConfirmedDescription')}
          </p>
          <Link
            to={logado ? '/' : '/login'}
            className="btn btn-primary btn-block btn-lg"
            style={{ borderRadius: 'var(--r-md)' }}
          >
            {logado ? t('goToSite') : t('login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
