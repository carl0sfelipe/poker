import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import TournamentList from './components/tournaments/TournamentList';
import CreateTournament from './components/tournaments/CreateTournament';
import TournamentDetail from './components/tournaments/TournamentDetail';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import authService from './services/authService';

// Componente para proteger rotas que requerem autenticação
const ProtectedRoute = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState(authService.getUser());

  useEffect(() => {
    // Atualiza o estado quando o token mudar
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated());
      setUser(authService.getUser());
    };

    // Verifica a autenticação a cada segundo
    const interval = setInterval(checkAuth, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-xl font-bold text-gray-800">
                    Poker Tournaments
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link to="/tournaments" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                    Torneios
                  </Link>
                  {isAuthenticated && (
                    <Link to="/tournaments/create" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                      Criar Torneio
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-900">
                      Olá, {user?.name || 'Usuário'}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-gray-900 hover:text-gray-600"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <>
                    <Link to="/login" className="text-gray-900 hover:text-gray-600">
                      Entrar
                    </Link>
                    <Link to="/register" className="text-gray-900 hover:text-gray-600">
                      Registrar
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
            <Route path="/register" element={<Register onRegister={() => setIsAuthenticated(true)} />} />
            <Route path="/" element={<Navigate to="/tournaments" />} />
            <Route path="/tournaments" element={<TournamentList />} />
            <Route
              path="/tournaments/create"
              element={
                <ProtectedRoute>
                  <CreateTournament />
                </ProtectedRoute>
              }
            />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 