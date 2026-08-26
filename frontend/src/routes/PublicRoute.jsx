import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center auth-wrapper">
        <div className="text-center text-light">
          <div className="spinner-border mb-3" role="status"></div>
          <p>{t('Verificando autenticação...')}</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
