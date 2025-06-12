import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';
import authService from '../../services/authService';
import TournamentTimer from './TournamentTimer';
import PlayerManagement from './PlayerManagement';

// Collapsible Card Component with Poker-themed animations
const CollapsibleCard = ({ title, icon, children, defaultOpen = false, cardColor = 'gray' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses = {
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'text-gray-600',
      arrow: 'text-gray-400',
      hover: 'hover:bg-gray-100'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      arrow: 'text-green-400',
      hover: 'hover:bg-green-100'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      arrow: 'text-purple-400',
      hover: 'hover:bg-purple-100'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      arrow: 'text-orange-400',
      hover: 'hover:bg-orange-100'
    }
  };

  const colors = colorClasses[cardColor] || colorClasses.gray;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${isOpen ? 'ring-2 ring-blue-200' : ''}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-4 flex items-center justify-between transition-all duration-300 ${colors.hover} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset`}
      >
        <div className="flex items-center">
          <div className={`${colors.icon} mr-3 transition-transform duration-300 ${isOpen ? 'scale-110' : ''}`}>
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className={`transition-all duration-500 ease-in-out ${colors.arrow} ${isOpen ? 'transform rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className={`px-6 pb-6 ${colors.bg} border-t ${colors.border}`}>
          <div className="pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAttempts, setDeleteAttempts] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const isStaff = authService.isStaff();
  const [selectedBonuses, setSelectedBonuses] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasChampion, setHasChampion] = useState(false);
  const [playerRefreshKey, setPlayerRefreshKey] = useState(0);

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      setError(null);
      const data = await tournamentService.getById(id);
      console.log('Tournament data received:', JSON.stringify(data));
      console.log('Bonuses structure:', JSON.stringify(data.bonuses, null, 2));
      setTournament(data);

      setHasChampion(
        data.registrations?.some(reg => reg.finish_place === 1) || false
      );
      
      // Check if user is registered
      if (data.registrations) {
        const user = authService.getUser();
        setIsRegistered(data.registrations.some(reg => reg.user_id === user?.id));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Load tournament error:', err);
      setLoading(false);
      
      if (err.message.includes('not found')) {
        // Se o torneio não foi encontrado, redireciona após 3 segundos
        setError('Tournament not found. Redirecting to tournaments list...');
        setTimeout(() => {
          navigate('/tournaments', { 
            state: { message: 'Tournament not found. It may have been deleted.' }
          });
        }, 3000);
      } else {
        setError(err.message || 'Failed to load tournament');
      }
    }
  };

  const handleRegister = async () => {
    try {
      setError(null);
      await tournamentService.register(id);
      setIsRegistered(true);
      await loadTournament(); // Refresh tournament data
      setPlayerRefreshKey(prev => prev + 1);
      setShowConfirmDialog(false);
    } catch (err) {
      setError(err.message || 'Failed to register for tournament');
    }
  };

  const handleExportResults = async () => {
    try {
      setError(null);
      const blob = await tournamentService.exportResults(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tournament-${id}-results.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Failed to export results');
    }
  };

  const handleDelete = async (forceDelete = false) => {
    if (!forceDelete && !window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setIsDeleting(true);
      setDeleteAttempts(prev => prev + 1);

      const result = await tournamentService.delete(id, forceDelete, forceDelete ? password : null);
      
      if (result.success) {
        navigate('/tournaments', { 
          state: { message: 'Tournament successfully deleted' }
        });
      } else {
        throw new Error('Failed to delete tournament');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setIsDeleting(false);
      
      if (err.message === 'FORCE_DELETE_REQUIRED') {
        setShowPasswordDialog(true);
        return;
      }

      // Se o erro for sobre o endpoint não encontrado
      if (err.message.includes('endpoint not found')) {
        setError('The delete feature is currently unavailable. Please try again later or contact the administrator.');
        // Desabilita o botão de deletar
        setDeleteAttempts(3);
      }
      // Se o erro indicar que o torneio não existe
      else if (err.message.includes('not found')) {
        setError('Tournament not found. Refreshing data...');
        await loadTournament();
      }
      // Se já tentou muitas vezes
      else if (deleteAttempts >= 2) {
        setError(`Failed to delete tournament after ${deleteAttempts + 1} attempts. Please try again later or contact support.`);
        // Desabilita o botão após 3 tentativas
        setDeleteAttempts(3);
      }
      // Outros erros
      else {
        setError(err.message || 'Failed to delete tournament');
      }
    }
  };

  const handleBonusSelect = (bonusName) => {
    setSelectedBonuses(prev => 
      prev.includes(bonusName)
        ? prev.filter(b => b !== bonusName)
        : [...prev, bonusName]
    );
  };

  const handleRebuy = async (isDouble = false) => {
    try {
      setError(null);
      await tournamentService.addRebuy(id, isDouble);
      loadTournament(); // Refresh tournament data
    } catch (err) {
      setError(err.message || 'Failed to process rebuy');
    }
  };

  if (loading || isDeleting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        {isDeleting && (
          <div className="text-center">
            <p className="text-gray-600 mb-2">Deleting tournament...</p>
            {deleteAttempts > 1 && (
              <p className="text-sm text-gray-500">Attempt {deleteAttempts} of 3</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!tournament && !error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Tournament not found. Redirecting to tournaments list...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className={`border px-8 py-6 rounded-2xl mb-10 relative shadow-lg backdrop-blur-sm ${
            error.includes('currently unavailable') 
              ? 'bg-amber-50/90 border-amber-200 text-amber-800'
              : 'bg-red-50/90 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {error.includes('currently unavailable') ? (
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold">
                  {error.includes('currently unavailable') ? 'Aviso' : 'Erro'}
                </h3>
                <p className="mt-1 text-sm">{error}</p>
                {(deleteAttempts >= 3 || error.includes('currently unavailable')) && (
                  <p className="mt-2 text-sm opacity-90">
                    Entre em contato com o administrador para assistência ou tente novamente mais tarde.
                  </p>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 ml-4 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {tournament && (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                <div className="flex justify-between items-start">
                  <div className="text-white">
                    <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
                    <div className="flex items-center space-x-4 text-blue-100">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(tournament.start_time).toLocaleString('pt-BR')}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        tournament.status === 'pending' ? 'bg-yellow-500 text-yellow-900' :
                        tournament.status === 'active' ? 'bg-green-500 text-green-900' :
                        'bg-gray-500 text-gray-100'
                      }`}>
                        {tournament.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {isStaff && (
                      <>
                        <button
                          onClick={handleExportResults}
                          className="inline-flex items-center px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Exportar Resultados
                        </button>
                        <button
                          onClick={() => handleDelete(false)}
                          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          disabled={isDeleting || deleteAttempts >= 3 || error?.includes('currently unavailable')}
                          title={
                            deleteAttempts >= 3
                              ? 'Maximum delete attempts reached. Please try again later.'
                              : error?.includes('currently unavailable')
                              ? 'Delete feature is currently unavailable'
                              : ''
                          }
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {isDeleting ? 'Deletando...' : 'Deletar Torneio'}
                        </button>
                      </>
                    )}
                    {tournament.status === 'pending' && !hasChampion && authService.isAuthenticated() && (
                      isRegistered ? (
                        <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg">
                          <svg className="w-5 h-5 mr-2 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Já Registrado
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirmDialog(true)}
                          className="inline-flex items-center px-6 py-2 bg-white text-blue-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          Registrar-se
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Info Grid - Collapsible Cards */}
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Info Card */}
              <CollapsibleCard
                title="Informações Básicas"
                defaultOpen={true}
                cardColor="gray"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-600 font-medium">Stack Inicial</span>
                    <span className="text-gray-900 font-semibold">{tournament.starting_stack.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-600 font-medium">Buy-in</span>
                    <span className="text-green-600 font-semibold">R$ {tournament.buy_in}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Jogadores</span>
                    <span className="text-gray-900 font-semibold">{tournament.registrations?.length || 0}</span>
                  </div>
                </div>
              </CollapsibleCard>

              {/* Bonuses Card */}
              {tournament.bonuses && tournament.bonuses.length > 0 && (
                <CollapsibleCard
                  title="Bônus no Buy-in"
                  cardColor="green"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  }
                >
                  <div className="space-y-3">
                    {tournament.bonuses.filter(b => !b.addon_bonus).map((bonus, index) => (
                      <div key={index} className="bg-white border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                        <div className="font-semibold text-green-900 mb-2">{bonus.name}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-600">Stack: <span className="font-medium text-gray-900">+{bonus.stack.toLocaleString()}</span></div>
                          <div className="text-gray-600">Preço: <span className="font-medium text-green-600">R$ {bonus.price || 0}</span></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">{bonus.condition}</div>
                      </div>
                    ))}
                  </div>
                </CollapsibleCard>
              )}

              {/* Add-on Card */}
              {tournament.addon?.allowed && (
                <CollapsibleCard
                  title="Add-on"
                  cardColor="purple"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                >
                  <div className="bg-white border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="text-gray-600">Stack: <span className="font-medium text-gray-900">+{tournament.addon.stack.toLocaleString()}</span></div>
                      <div className="text-gray-600">Preço: <span className="font-medium text-purple-600">R$ {tournament.addon.price}</span></div>
                    </div>
                    
                    {/* Bônus único do add-on */}
                    {tournament.addon.bonus_enabled && tournament.addon.bonus && (
                      <div className="border-t border-purple-300 pt-3 mt-3">
                        <div className="font-medium text-purple-900 mb-2">Bônus do Add-on</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-600">Stack: <span className="font-medium text-purple-700">+{tournament.addon.bonus.stack.toLocaleString()}</span></div>
                          <div className="text-gray-600">Preço: <span className="font-medium text-purple-600">R$ {tournament.addon.bonus.price || 0}</span></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Bônus exclusivos do add-on */}
                    {tournament.addon_bonuses && tournament.addon_bonuses.length > 0 && (
                      <div className="border-t border-purple-300 pt-3 mt-3">
                        <div className="font-medium text-purple-900 mb-2">Bônus Exclusivos</div>
                        {tournament.addon_bonuses.map((bonus, index) => (
                          <div key={index} className="grid grid-cols-2 gap-2 text-sm mb-2 last:mb-0">
                            <div className="text-gray-600">Stack: <span className="font-medium text-purple-700">+{bonus.stack.toLocaleString()}</span></div>
                            <div className="text-gray-600">Preço: <span className="font-medium text-purple-600">R$ {bonus.price || 0}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleCard>
              )}

              {/* Rebuy Section */}
              {tournament.rebuy?.allowed && (
                <CollapsibleCard
                  title="Opções de Rebuy"
                  cardColor="orange"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                      <div className="font-semibold text-orange-900 mb-3">Rebuy Simples</div>
                      <div className="space-y-2 text-sm">
                        <div className="text-gray-600">Stack: <span className="font-medium text-gray-900">+{tournament.rebuy.single.stack.toLocaleString()}</span></div>
                        <div className="text-gray-600">Preço: <span className="font-medium text-orange-600">R$ {tournament.rebuy.single.price}</span></div>
                      </div>
                    </div>
                    <div className="bg-white border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                      <div className="font-semibold text-orange-900 mb-3">Rebuy Duplo</div>
                      <div className="space-y-2 text-sm">
                        <div className="text-gray-600">Stack: <span className="font-medium text-gray-900">+{tournament.rebuy.double.stack.toLocaleString()}</span></div>
                        <div className="text-gray-600">Preço: <span className="font-medium text-orange-600">R$ {tournament.rebuy.double.price}</span></div>
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>
              )}
            </div>

            {/* Registration confirmation dialog */}
            {showConfirmDialog && !isRegistered && !hasChampion && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Confirm Registration</h3>
                  <p className="mb-6 text-gray-700">
                    Are you sure you want to register for this tournament?
                  </p>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowConfirmDialog(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegister}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Password confirmation dialog */}
            {showPasswordDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                  <p className="mb-4 text-gray-700">
                    This tournament has already started or has registered players. 
                    Please enter your password to confirm deletion.
                  </p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 border rounded mb-4"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowPasswordDialog(false);
                        setPassword('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordDialog(false);
                        handleDelete(true);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      disabled={!password}
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isStaff && (
              <PlayerManagement
                tournamentId={id}
                refreshKey={playerRefreshKey}
                registrationClosed={hasChampion}
              />
            )}
            
            <TournamentTimer tournament={tournament} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDetail;