import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './routes/PrivateRoute';
import CadastroPecas from './pages/CadastroPecas';
import CadastroUsuario from './pages/CadastroUsuario';
import BuscaPecas from './pages/BuscaPecas';
import ProfilePage from './pages/ProfilePage';


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<Navigate to="/cadastro-usuario" replace />} />
      <Route path="/cadastro-usuario" element={<CadastroUsuario />} />
      <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route path="/cadastroPecas" element={<CadastroPecas />} />
      <Route path="/buscaPecas" element={<BuscaPecas />} />
      <Route path="*" element={<Navigate to="/" replace />} />

      <Route
        path="/perfil"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
