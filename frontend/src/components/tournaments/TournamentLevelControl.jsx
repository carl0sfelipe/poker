import React, { useState, useEffect } from 'react';
import tournamentService from '../../services/tournamentService';

const TournamentLevelControl = ({ tournament, onLevelUpdate }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleNextLevel = async () => {
    try {
      setLoading(true);
      setError(null);

      const nextLevel = tournament.current_level + 1;
      const nextBlindIndex = tournament.current_blind_index + 1;
      const isBreak = false;

      const updatedTournament = await tournamentService.updateTournamentLevel(
        tournament.id,
        nextLevel,
        nextBlindIndex,
        isBreak
      );

      onLevelUpdate(updatedTournament);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBreak = async () => {
    try {
      setLoading(true);
      setError(null);

      const isBreak = !tournament.is_break;

      const updatedTournament = await tournamentService.updateTournamentLevel(
        tournament.id,
        tournament.current_level,
        tournament.current_blind_index,
        isBreak
      );

      onLevelUpdate(updatedTournament);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Controle de Níveis</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">Nível Atual: {tournament.current_level}</p>
            <p className="text-sm text-gray-600">
              {tournament.is_break ? 'Em Intervalo' : 'Em Andamento'}
            </p>
          </div>

          <div className="space-x-4">
            <button
              onClick={handleBreak}
              disabled={loading}
              className={`px-4 py-2 rounded ${
                tournament.is_break
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {tournament.is_break ? 'Retomar Torneio' : 'Iniciar Intervalo'}
            </button>

            <button
              onClick={handleNextLevel}
              disabled={loading || tournament.is_break}
              className="px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
            >
              Próximo Nível
            </button>
          </div>
        </div>

        {/* Informações de Restrições */}
        <div className="mt-6 space-y-2 text-sm text-gray-600">
          {tournament.rebuy.allowed && (
            <p>
              • Rebuys permitidos até o nível {tournament.rebuy_max_level}
              {tournament.current_level <= tournament.rebuy_max_level && 
               ` (${tournament.rebuy_max_level - tournament.current_level} níveis restantes)`}
            </p>
          )}
          
          {tournament.addon.allowed && (
            <p>
              • Add-on disponível no intervalo do nível {tournament.addon_break_level}
              {tournament.current_level < tournament.addon_break_level && 
               ` (em ${tournament.addon_break_level - tournament.current_level} níveis)`}
            </p>
          )}

          {tournament.current_level <= tournament.addon_break_level && (
            <p className="text-yellow-600">
              • Eliminações não permitidas até o final do intervalo de add-on
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentLevelControl; 