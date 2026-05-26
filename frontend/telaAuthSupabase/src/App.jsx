import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PrivateRoute from './routes/PrivateRoute';
import PublicRoute from './routes/PublicRoute';
import CadastroPecas from './pages/CadastroPecas';
import CadastroUsuario from './pages/CadastroUsuario';
import BuscaPecas from './pages/BuscaPecas';
import ProfilePage from './pages/ProfilePage';
import EditarPecas from './pages/EditarPecas';
import DetalhePeca from './pages/DetalhePeca';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/cadastro" element={<Navigate to="/cadastro-usuario" replace />} />
      <Route
        path="/cadastro-usuario"
        element={
          <PublicRoute>
            <CadastroUsuario />
          </PublicRoute>
        }
      />
      <Route
        path="/recuperar-senha"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route
        path="/cadastroPecas"
        element={
          <PrivateRoute>
            <CadastroPecas />
          </PrivateRoute>
        }
      />
      <Route
        path="/buscaPecas"
        element={
          <PrivateRoute>
            <BuscaPecas />
          </PrivateRoute>
        }
      />
      <Route
        path="/pecas/:id"
        element={
          <PrivateRoute>
            <DetalhePeca />
          </PrivateRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/editar-pecas"
        element={
          <PrivateRoute>
            <EditarPecas />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
