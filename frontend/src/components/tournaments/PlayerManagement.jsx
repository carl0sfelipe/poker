import React, { useState, useEffect } from 'react';
import tournamentService from '../../services/tournamentService';
import authService from '../../services/authService';
import userService from '../../services/userService';
import SettlementModal from './SettlementModal';

const PlayerManagement = ({ tournamentId, refreshKey = 0, registrationClosed = false }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [tournamentStats, setTournamentStats] = useState({
    totalSingleRebuys: 0,
    totalDoubleRebuys: 0,
    totalAddons: 0
  });
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '' });
  const [existingUsers, setExistingUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [settlementPlayer, setSettlementPlayer] = useState(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const isStaff = authService.isStaff();
  // Referência para manter a ordem original dos jogadores
  const [originalOrder, setOriginalOrder] = useState([]);
  
  // Novos estados para o modal de confirmação de check-in
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [pendingRebuy, setPendingRebuy] = useState({
    userId: null,
    isDouble: false
  });

  useEffect(() => {
    if (!isStaff) {
      setError('Unauthorized access');
      setLoading(false);
      return;
    }
    loadPlayers();
  }, [tournamentId, isStaff, refreshKey]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await userService.list();
        setExistingUsers(data);
      } catch (err) {
        console.error('Failed to load users', err);
      }
    };
    if (isStaff) {
      fetchUsers();
    }
  }, [isStaff]);

  const calculateTournamentStats = (registrations) => {
    const stats = {
      totalSingleRebuys: 0,
      totalDoubleRebuys: 0,
      totalAddons: 0
    };

    registrations.forEach(player => {
      stats.totalSingleRebuys += player.single_rebuys || 0;
      stats.totalDoubleRebuys += player.double_rebuys || 0;
      stats.totalAddons += player.addon_used ? 1 : 0;
    });

    setTournamentStats(stats);
  };

  // Função auxiliar para ordenar jogadores
  const sortPlayers = (players) => {
    return [...players].sort((a, b) => b.id - a.id);  // Ordena pelo ID do registro em ordem decrescente
  };

  const maintainOrder = (newPlayers) => {
    // Se é a primeira carga, define a ordem original
    if (originalOrder.length === 0) {
      const orderIds = newPlayers.map(p => p.id);
      setOriginalOrder(orderIds);
      return newPlayers;
    }

    // Mantém a ordem original independente das alterações de stack
    const orderedPlayers = [];
    const newPlayersMap = new Map(newPlayers.map(p => [p.id, p]));
    
    // Primeiro adiciona os jogadores existentes na ordem original
    originalOrder.forEach(id => {
      if (newPlayersMap.has(id)) {
        orderedPlayers.push(newPlayersMap.get(id));
        newPlayersMap.delete(id);
      }
    });
    
    // Adiciona quaisquer novos jogadores que não estavam na ordem original
    if (newPlayersMap.size > 0) {
      const newIds = [];
      newPlayersMap.forEach((player) => {
        orderedPlayers.push(player);
        newIds.push(player.id);
      });
      
      // Atualiza a ordem original para incluir os novos jogadores
      setOriginalOrder([...newIds, ...originalOrder]);
    }
    
    return orderedPlayers;
  };

  const loadPlayers = async () => {
    try {
      const data = await tournamentService.getById(tournamentId);
      setTournament(data);
      
      // Mantém a ordem original, a menos que um campeão tenha sido coroado
      const hasChampion = (data.registrations || []).some(player => player.finish_place === 1);
      
      // Se tiver um campeão, reordena os jogadores pelo finish_place
      if (hasChampion) {
        const sortedPlayers = [...data.registrations].sort((a, b) => {
          // Campeão primeiro, depois por posição final (menor número = melhor posição)
          if (a.finish_place && b.finish_place) return a.finish_place - b.finish_place;
          if (a.finish_place) return -1; // Jogadores com posição ficam no topo
          if (b.finish_place) return 1;
          return 0; // Mantém ordem original para jogadores sem posição final
        });
        setPlayers(sortedPlayers);
        // Atualiza a ordem original apenas quando há campeão
        setOriginalOrder(sortedPlayers.map(p => p.id));
      } else {
        // Se não tem campeão, mantém a ordem original ou define se for a primeira carga
        const orderedPlayers = maintainOrder(data.registrations || []);
        setPlayers(orderedPlayers);
      }
      
      calculateTournamentStats(data.registrations || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load players');
      setLoading(false);
    }
  };

  const handleCheckIn = async (userId) => {
    if (!isStaff) return;
    try {
      await tournamentService.checkIn(tournamentId, userId);
      const data = await tournamentService.getById(tournamentId);
      
      // Atualiza apenas os dados dos jogadores mantendo a ordem original
      const updatedPlayers = players.map(player => {
        const updatedPlayer = data.registrations.find(r => r.id === player.id);
        return updatedPlayer || player;
      });
      
      setPlayers(updatedPlayers);
      setError(null);
    } catch (err) {
      console.error('Check-in error:', err);
      setError(err.message || 'Failed to check in player');
    }
  };

  const handleEliminate = async (userId) => {
    if (!isStaff) return;
    try {
      await tournamentService.eliminatePlayer(tournamentId, userId);
      // Após eliminação, recarrega completamente para verificar se há campeão
      await loadPlayers();
      setError(null);
    } catch (err) {
      setError('Failed to eliminate player');
    }
  };

  const handleRebuy = async (userId, isDouble = false) => {
    if (!isStaff) return;
    try {
      // Check if the player's rebuy payment is already settled
      const player = players.find(p => p.user_id === userId);
      if (player && player.rebuys_paid) {
        setError('Não é possível fazer rebuy: pagamento já foi acertado');
        return;
      }

      await tournamentService.performRebuy(tournamentId, userId, isDouble);
      const data = await tournamentService.getById(tournamentId);
      
      // Atualiza apenas os dados dos jogadores mantendo a ordem original
      const updatedPlayers = players.map(player => {
        const updatedPlayer = data.registrations.find(r => r.id === player.id);
        return updatedPlayer || player;
      });
      
      setPlayers(updatedPlayers);
      calculateTournamentStats(data.registrations || []);
      setError(null);
    } catch (err) {
      console.error('Rebuy error:', err);
      setError(err.message || `Failed to process ${isDouble ? 'double' : 'single'} rebuy`);
    }
  };

  const handleAddon = async (userId) => {
    if (!isStaff) return;
    try {
      await tournamentService.performAddon(tournamentId, userId);
      const data = await tournamentService.getById(tournamentId);
      
      // Atualiza apenas os dados dos jogadores mantendo a ordem original
      const updatedPlayers = players.map(player => {
        const updatedPlayer = data.registrations.find(r => r.id === player.id);
        return updatedPlayer || player;
      });
      
      setPlayers(updatedPlayers);
      calculateTournamentStats(data.registrations || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to process add-on');
    }
  };

  const handleManualRegister = async () => {
    if (registrationClosed) return;
    if (!newPlayer.name || !newPlayer.email) return;
    try {
      await tournamentService.manualRegister(
        tournamentId,
        newPlayer.name,
        newPlayer.email
      );
      setNewPlayer({ name: '', email: '' });
      const data = await tournamentService.getById(tournamentId);
      const orderedPlayers = maintainOrder(data.registrations || []);
      setPlayers(orderedPlayers);
      calculateTournamentStats(data.registrations || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to register player');
    }
  };

  const handleRegisterExisting = async () => {
    if (registrationClosed) return;
    if (!selectedUserId) return;
    const user = existingUsers.find(u => u.id === selectedUserId);
    if (!user) return;
    try {
      await tournamentService.manualRegister(tournamentId, user.name, user.email);
      setSelectedUserId('');
      const data = await tournamentService.getById(tournamentId);
      const orderedPlayers = maintainOrder(data.registrations || []);
      setPlayers(orderedPlayers);
      calculateTournamentStats(data.registrations || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to register player');
    }
  };

  const openSettlement = (player) => {
    setSettlementPlayer(player);
    setShowSettlement(true);
  };

  const closeSettlement = async (refresh = false) => {
    setShowSettlement(false);
    setSettlementPlayer(null);
    if (refresh) {
      await loadPlayers();
    }
  };

  // Função modificada para verificar check-in antes de fazer rebuy
  const handleRebuyClick = (player, isDouble = false) => {
    if (!isStaff) return;
    
    // Check if payment is already settled
    if (player.rebuys_paid) {
      setError('Não é possível fazer rebuy: pagamento já foi acertado');
      return;
    }
    
    // Se o jogador já fez check-in, faz rebuy direto
    if (player.checked_in) {
      handleRebuy(player.user_id, isDouble);
    } else {
      // Se não, mostra o modal perguntando se quer fazer check-in primeiro
      setPendingRebuy({
        userId: player.user_id,
        isDouble
      });
      setShowCheckInModal(true);
    }
  };

  // Função para lidar com a confirmação do modal de check-in
  const handleCheckInConfirm = async () => {
    try {
      // Check if the player's rebuy payment is already settled
      const player = players.find(p => p.user_id === pendingRebuy.userId);
      if (player && player.rebuys_paid) {
        setError('Não é possível fazer rebuy: pagamento já foi acertado');
        handleCheckInCancel();
        return;
      }

      // Primeiro faz o check-in
      await tournamentService.checkIn(tournamentId, pendingRebuy.userId);
      
      // Depois faz o rebuy
      await tournamentService.performRebuy(tournamentId, pendingRebuy.userId, pendingRebuy.isDouble);
      
      // Atualiza os dados
      const data = await tournamentService.getById(tournamentId);
      
      // Atualiza apenas os dados dos jogadores mantendo a ordem original
      const updatedPlayers = players.map(player => {
        const updatedPlayer = data.registrations.find(r => r.id === player.id);
        return updatedPlayer || player;
      });
      
      setPlayers(updatedPlayers);
      calculateTournamentStats(data.registrations || []);
      setError(null);
    } catch (err) {
      console.error('Check-in + Rebuy error:', err);
      setError(err.message || 'Failed to check in and rebuy');
    } finally {
      // Fecha o modal e limpa o estado pendente
      setShowCheckInModal(false);
      setPendingRebuy({
        userId: null,
        isDouble: false
      });
    }
  };

  // Função para cancelar a operação de check-in + rebuy
  const handleCheckInCancel = () => {
    setShowCheckInModal(false);
    setPendingRebuy({
      userId: null,
      isDouble: false
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Carregando jogadores...</span>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.582 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-800 font-medium">Acesso não autorizado</span>
        </div>
      </div>
    );
  }

  // Filtrar usuários que já estão registrados no torneio
  const registeredUserIds = players.map(player => player.user_id);
  const availableUsers = existingUsers.filter(user => !registeredUserIds.includes(user.id));

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Erro</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Gerenciamento de Jogadores
          </h2>
          <p className="text-indigo-100 mt-2">Total de {players.length} jogadores registrados</p>
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 bg-gray-50">
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{tournamentStats.totalSingleRebuys}</div>
            <div className="text-sm text-gray-600 font-medium">Rebuys Simples</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{tournamentStats.totalDoubleRebuys}</div>
            <div className="text-sm text-gray-600 font-medium">Rebuys Duplos</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{tournamentStats.totalAddons}</div>
            <div className="text-sm text-gray-600 font-medium">Add-ons</div>
          </div>
        </div>
      </div>

      {/* Add Player Section */}
      {!registrationClosed ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Adicionar Jogador
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Manual Registration */}
            <div className="space-y-4 flex flex-col">
              <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Novo Jogador</h4>
              <div className="space-y-4 flex-grow">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                  <input
                    type="text"
                    placeholder="Digite o nome do jogador"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Digite o email do jogador"
                    value={newPlayer.email}
                    onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                  />
                </div>
              </div>
              <div className="mt-auto">
                <button
                  onClick={handleManualRegister}
                  disabled={!newPlayer.name || !newPlayer.email}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Registrar Novo Jogador
                </button>
              </div>
            </div>

            {/* Existing User Registration */}
            <div className="space-y-4 flex flex-col">
              <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Usuário Existente</h4>
              <div className="space-y-4 flex-grow">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Usuário</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="">
                      {availableUsers.length === 0 
                        ? "Todos os usuários já estão registrados" 
                        : "Selecione um usuário existente"
                      }
                    </option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                {availableUsers.length === 0 && existingUsers.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Todos os usuários já estão registrados</p>
                        <p className="mt-1">Para adicionar mais jogadores, use o formulário de "Novo Jogador".</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-auto">
                <button
                  onClick={handleRegisterExisting}
                  disabled={!selectedUserId || availableUsers.length === 0}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Registrar Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.582 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Registros Encerrados</h3>
              <p className="text-yellow-700 mt-1">O torneio foi finalizado e um campeão foi coroado.</p>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.582 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Check-in Necessário</h3>
              </div>
              <p className="text-gray-600 mb-6">
                O jogador precisa fazer check-in antes de realizar rebuy. Deseja fazer check-in e rebuy agora?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCheckInCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCheckInConfirm}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  Fazer Check-in e Rebuy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Lista de Jogadores ({players.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jogador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Stack
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rebuys & Add-ons
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
                </th>
                {(tournament?.rebuy?.allowed || tournament?.addon?.allowed) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opções de Stack
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.map((player, index) => (
                <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          player.finish_place === 1 ? 'bg-yellow-500' :
                          player.eliminated ? 'bg-red-500' :
                          player.checked_in ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          {player.finish_place === 1 ? '🏆' : 
                           (player.user_name || player.user_email).charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {player.user_name || player.user_email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500">{player.user_email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-900">
                        Stack: {player.current_stack.toLocaleString()}
                      </div>
                      <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        player.eliminated ? 
                          (player.finish_place === 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800') :
                        player.checked_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {player.eliminated ? 
                          (player.finish_place === 1 ? 'Campeão' : `${player.finish_place}º Lugar`) :
                          (player.checked_in ? 'Jogando' : 'Aguardando Check-in')
                        }
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          Simples: {player.single_rebuys || 0}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                          Duplo: {player.double_rebuys || 0}
                        </span>
                      </div>
                      {tournament?.addon?.allowed && (
                        <div className="text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            player.addon_used ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Add-on: {player.addon_used ? '✓' : '✗'}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {!player.checked_in && (
                        <button
                          onClick={() => handleCheckIn(player.user_id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Check-in
                        </button>
                      )}
                      {player.checked_in && !player.eliminated && (
                        <button
                          onClick={() => handleEliminate(player.user_id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {player.rebuys_paid && (player.addon_used ? player.addon_paid : true) ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Pago
                      </span>
                    ) : (
                      <button
                        onClick={() => openSettlement(player)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        Acertar
                      </button>
                    )}
                  </td>
                  
                  {(tournament?.rebuy?.allowed || tournament?.addon?.allowed) && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        {tournament.rebuy?.allowed && !player.eliminated && !player.rebuys_paid && (
                          <>
                            <button
                              onClick={() => handleRebuyClick(player, false)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                              title={`Adicionar ${tournament.rebuy.single.stack.toLocaleString()} fichas por R$ ${tournament.rebuy.single.price}`}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Rebuy Simples
                            </button>
                            <button
                              onClick={() => handleRebuyClick(player, true)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200"
                              title={`Adicionar ${tournament.rebuy.double.stack.toLocaleString()} fichas por R$ ${tournament.rebuy.double.price}`}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Rebuy Duplo
                            </button>
                          </>
                        )}
                        {tournament.rebuy?.allowed && !player.eliminated && player.rebuys_paid && (
                          <div className="flex items-center text-xs text-gray-500">
                            <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pagamento Acertado
                          </div>
                        )}

                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {players.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum jogador registrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece adicionando jogadores ao torneio usando os formulários acima.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Settlement Modal */}
      {showSettlement && settlementPlayer && (
        <SettlementModal
          isOpen={showSettlement}
          onClose={closeSettlement}
          player={settlementPlayer}
          tournament={tournament}
        />
      )}
    </div>
  );
};

export default PlayerManagement;