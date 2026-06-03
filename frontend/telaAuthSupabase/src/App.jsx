import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import PublicRoute from './routes/PublicRoute';

// Carregamento sob demanda — reduz bundle inicial ~60%
const HomePage            = lazy(() => import('./pages/HomePage'));
const LoginPage           = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage  = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('./pages/ResetPasswordPage'));
const CadastroUsuario     = lazy(() => import('./pages/CadastroUsuario'));
const CadastroPecas       = lazy(() => import('./pages/CadastroPecas'));
const BuscaPecas          = lazy(() => import('./pages/BuscaPecas'));
const ProfilePage         = lazy(() => import('./pages/ProfilePage'));
const EditarPecas         = lazy(() => import('./pages/EditarPecas'));
const DetalhePeca         = lazy(() => import('./pages/DetalhePeca'));
const FornecedorPerfil    = lazy(() => import('./pages/FornecedorPerfil'));
const WishPage            = lazy(() => import('./pages/WishPage'));
const CarrinhoPage        = lazy(() => import('./pages/CarrinhoPage'));
const CheckoutPage        = lazy(() => import('./pages/CheckoutPage'));
const PedidosPage         = lazy(() => import('./pages/PedidosPage'));
const ChatPage            = lazy(() => import('./pages/ChatPage'));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE4CC' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #CFC5A5', borderTopColor: '#152218', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#6B7D6E', fontSize: '.875rem' }}>Carregando…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/home" element={<PrivateRoute><HomePage /></PrivateRoute>} />

        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/cadastro" element={<Navigate to="/cadastro-usuario" replace />} />
        <Route path="/cadastro-usuario" element={<PublicRoute><CadastroUsuario /></PublicRoute>} />
        <Route path="/recuperar-senha" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

        <Route path="/cadastroPecas" element={<PrivateRoute><CadastroPecas /></PrivateRoute>} />
        <Route path="/buscaPecas" element={<PrivateRoute><BuscaPecas /></PrivateRoute>} />
        <Route path="/pecas/:id" element={<PrivateRoute><DetalhePeca /></PrivateRoute>} />
        <Route path="/vendedores/:id" element={<PrivateRoute><FornecedorPerfil /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/wish" element={<PrivateRoute><WishPage /></PrivateRoute>} />
        <Route path="/carrinho" element={<PrivateRoute><CarrinhoPage /></PrivateRoute>} />
        <Route path="/checkout" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
        <Route path="/pedidos" element={<PrivateRoute><PedidosPage /></PrivateRoute>} />
        <Route path="/pedidos/:id" element={<PrivateRoute><PedidosPage /></PrivateRoute>} />
        <Route path="/editar-pecas" element={<PrivateRoute><EditarPecas /></PrivateRoute>} />
        <Route path="/chat/:id" element={<PrivateRoute><ChatPage /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
