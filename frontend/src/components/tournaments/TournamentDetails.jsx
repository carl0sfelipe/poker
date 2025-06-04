import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import TournamentLevelControl from './TournamentLevelControl';
import TournamentStats from './TournamentStats';
import PlayersList from './PlayersList';
import TournamentHistory from './TournamentHistory';

const TournamentDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettlement, setShowSettlement] = useState(false);
  const [includeAddon, setIncludeAddon] = useState(false);

  const singleRebuyPrice = tournament?.rebuy?.single?.price || 0;
  const doubleRebuyPrice = tournament?.rebuy?.double?.price || 0;
  const rebuysDue =
    (registration?.single_rebuys || 0) * singleRebuyPrice +
    (registration?.double_rebuys || 0) * doubleRebuyPrice;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournamentData, registrationData] = await Promise.all([
          tournamentService.getById(id),
          user ? tournamentService.getRegistration(id, user.id) : null
        ]);
        setTournament(tournamentData);
        setRegistration(registrationData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleRebuy = async (type) => {
    try {
      if (!registration) {
        setError('Você precisa estar registrado para fazer rebuy');
        return;
      }

      // Validações de rebuy
      if (tournament.current_level > tournament.rebuy_max_level) {
        setError('Rebuys não são mais permitidos neste nível');
        return;
      }

      if (type === 'single' && registration.current_stack >= tournament.max_stack_for_single_rebuy) {
        setError('Seu stack atual é muito alto para rebuy simples');
        return;
      }

      if (type === 'double' && registration.current_stack > 0) {
        setError('Rebuy duplo só é permitido quando você está sem fichas');
        return;
      }

      const updatedRegistration = await tournamentService.performRebuy(id, user.id, type);
      setRegistration(updatedRegistration);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddon = async () => {
    try {
      if (!registration) {
        setError('Você precisa estar registrado para fazer add-on');
        return;
      }

      if (tournament.current_level !== tournament.addon_break_level || !tournament.is_break) {
        setError('Add-on só é permitido durante o intervalo específico');
        return;
      }

      const updatedRegistration = await tournamentService.performAddon(id, user.id);
      setRegistration(updatedRegistration);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const openSettlement = () => {
    setIncludeAddon(false);
    setShowSettlement(true);
  };

  const confirmSettlement = async () => {
    try {
      if (includeAddon && tournament.addon.allowed && !registration.addon_used) {
        const updated = await tournamentService.performAddon(id, user.id);
        setRegistration(updated);
      }
      setShowSettlement(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEliminatePlayer = async (playerId) => {
    try {
      await tournamentService.eliminatePlayer(tournament.id, playerId);
      // Recarregar os dados do torneio
      const updatedTournament = await tournamentService.getById(tournament.id);
      setTournament(updatedTournament);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLevelUpdate = (updatedTournament) => {
    setTournament(updatedTournament);
  };

  if (loading) return <div>Carregando...</div>;
  if (!tournament) return <div>Torneio não encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{tournament.name}</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Controle de Níveis (apenas para administradores) */}
      {user?.is_admin && (
        <TournamentLevelControl
          tournament={tournament}
          onLevelUpdate={handleLevelUpdate}
        />
      )}

      {/* Estatísticas do Torneio (apenas para administradores) */}
      {user?.is_admin && (
        <TournamentStats tournament={tournament} />
      )}

      {/* Informações do Jogador */}
      {registration && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Seu Status</h2>
          <div className="space-y-2">
            <p><strong>Stack Atual:</strong> {registration.current_stack}</p>
            <p><strong>Rebuys Simples:</strong> {registration.single_rebuys}</p>
            <p><strong>Rebuys Duplos:</strong> {registration.double_rebuys}</p>
            <p><strong>Add-on Realizado:</strong> {registration.addon_used ? 'Sim' : 'Não'}</p>
            <p><strong>Status:</strong> {registration.eliminated ? 'Eliminado' : 'Ativo'}</p>
            
            {!registration.eliminated && tournament.current_level > tournament.addon_break_level && (
              <button
                onClick={() => handleEliminatePlayer(registration.user_id)}
                className="mt-4 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
              >
                Marcar como Eliminado
              </button>
            )}
          </div>
        </div>
      )}

      {/* Opções de Rebuy */}
      {registration && !registration.eliminated && tournament.rebuy.allowed && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Rebuys</h2>
          <div className="space-y-4">
            {tournament.current_level <= tournament.rebuy_max_level && (
              <>
                <div>
                  <h3 className="font-medium mb-2">Rebuy Simples</h3>
                  <p>Stack: {tournament.rebuy.single.stack}</p>
                  <p>Preço: R$ {tournament.rebuy.single.price}</p>
                  <button
                    onClick={() => handleRebuy('single')}
                    className="mt-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600"
                    disabled={registration.current_stack >= tournament.max_stack_for_single_rebuy}
                  >
                    Fazer Rebuy Simples
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Rebuy Duplo</h3>
                  <p>Stack: {tournament.rebuy.double.stack}</p>
                  <p>Preço: R$ {tournament.rebuy.double.price}</p>
                  <button
                    onClick={() => handleRebuy('double')}
                    className="mt-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600"
                    disabled={registration.current_stack > 0}
                  >
                    Fazer Rebuy Duplo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Settlement */}
      {registration && !registration.eliminated && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Settle Up</h2>
          <button
            onClick={openSettlement}
            className="mt-2 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Settle Up
          </button>
        </div>
      )}

      {/* Lista de Jogadores */}
      <PlayersList
        tournament={tournament}
        onEliminatePlayer={handleEliminatePlayer}
      />

      {/* Histórico do Torneio */}
      <TournamentHistory tournament={tournament} />

      {showSettlement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Settle Up</h3>
            <p className="mb-2 text-gray-700">Rebuys Due: R$ {rebuysDue}</p>
            {tournament.addon.allowed && !registration.addon_used && (
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={includeAddon}
                  onChange={(e) => setIncludeAddon(e.target.checked)}
                />
                <span>Add-on for R$ {tournament.addon.price} (+{tournament.addon.stack} chips)</span>
              </label>
            )}
            <p className="mb-6 font-semibold">
              Total: R$ {rebuysDue + (includeAddon ? tournament.addon.price : 0)}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSettlement(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmSettlement}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetails; 