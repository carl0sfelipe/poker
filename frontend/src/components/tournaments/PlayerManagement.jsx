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

  if (!isStaff) return null;
  if (loading) return <div className="text-center p-4">Loading players...</div>;
  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
      <strong className="font-bold">Error: </strong>
      <span className="block sm:inline">{error}</span>
      <button
        className="absolute top-0 bottom-0 right-0 px-4 py-3"
        onClick={() => setError(null)}
      >
        <span className="sr-only">Dismiss</span>
        <svg className="h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <title>Close</title>
          <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
        </svg>
      </button>
    </div>
  );

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Player Management</h2>
      
      {/* Tournament Stats */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{tournamentStats.totalSingleRebuys}</div>
          <div className="text-sm text-gray-600">Total Single Rebuys</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">{tournamentStats.totalDoubleRebuys}</div>
          <div className="text-sm text-gray-600">Total Double Rebuys</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-yellow-600">{tournamentStats.totalAddons}</div>
          <div className="text-sm text-gray-600">Total Add-ons</div>
        </div>
      </div>

      {/* Manual Registration */}
      {!registrationClosed ? (
        <div className="bg-white p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium mb-2">Add Player</h3>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Name"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                className="border rounded px-2 py-1"
              />
              <input
                type="email"
                placeholder="Email"
                value={newPlayer.email}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, email: e.target.value })
                }
                className="border rounded px-2 py-1"
              />
              <button
                onClick={handleManualRegister}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <div className="flex space-x-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="border rounded px-2 py-1 flex-grow"
              >
                <option value="">Select existing user</option>
                {existingUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleRegisterExisting}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          Registrations are closed. A champion has been crowned.
        </div>
      )}

      {/* Modal de confirmação para fazer check-in antes do rebuy */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Check-in necessário</h3>
            <p className="mb-4">
              O jogador precisa fazer check-in antes de realizar rebuy. Deseja fazer check-in e rebuy agora?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCheckInCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCheckInConfirm}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Fazer Check-in e Rebuy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rebuys</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              {(tournament?.rebuy?.allowed || tournament?.addon?.allowed) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stack Options</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {players.map((player) => (
              <tr key={player.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {player.user_name || player.user_email.split('@')[0]}
                  </div>
                  <div className="text-sm text-gray-500">{player.user_email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Stack: {player.current_stack.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {player.checked_in ? 'Checked In' : 'Not Checked In'}
                  </div>
                  {player.eliminated && (
                    <div className="text-sm font-medium">
                      {player.finish_place === 1 ? (
                        <span className="text-yellow-600">🏆 Champion</span>
                      ) : (
                        <span className="text-gray-600">
                          {player.finish_place}º Place
                        </span>
                      )}
                    </div>
                  )}
                  {!player.eliminated && player.checked_in && (
                    <div className="text-sm text-green-600">
                      Still Playing
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Single: {player.single_rebuys || 0}
                  </div>
                  <div className="text-sm text-gray-900">
                    Double: {player.double_rebuys || 0}
                  </div>
                  {tournament?.addon?.allowed && (
                    <div className="text-sm text-gray-900">
                      Add-on: {player.addon_used ? 1 : 0}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {!player.checked_in && (
                      <button
                        onClick={() => handleCheckIn(player.user_id)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Check In
                      </button>
                    )}
                    {player.checked_in && !player.eliminated && (
                      <button
                        onClick={() => handleEliminate(player.user_id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminate
                      </button>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {player.rebuys_paid && (player.addon_used ? player.addon_paid : true) ? (
                    <span className="text-green-600 font-medium">Paid</span>
                  ) : (
                    <button
                      onClick={() => openSettlement(player)}
                      className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                    >
                      Settle Up
                    </button>
                  )}
                </td>
                {(tournament?.rebuy?.allowed || tournament?.addon?.allowed) && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {tournament.rebuy?.allowed && !player.eliminated && (
                        <>
                          <button
                            onClick={() => handleRebuyClick(player, false)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            title={`Add ${tournament.rebuy.single.stack.toLocaleString()} chips for $${tournament.rebuy.single.price}`}
                          >
                            Single Rebuy
                          </button>
                          <button
                            onClick={() => handleRebuyClick(player, true)}
                            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                            title={`Add ${tournament.rebuy.double.stack.toLocaleString()} chips for $${tournament.rebuy.double.price}`}
                          >
                            Double Rebuy
                          </button>
                        </>
                      )}
                      
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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