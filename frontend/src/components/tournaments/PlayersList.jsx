import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const PlayersList = ({ tournament, onEliminatePlayer }) => {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState('stack'); // stack, rebuys, elimination
  const [filterBy, setFilterBy] = useState('all'); // all, active, eliminated

  // Ordenar jogadores
  const sortPlayers = (players) => {
    return [...players].sort((a, b) => {
      switch (sortBy) {
        case 'stack':
          return b.stack_at_rebuy - a.stack_at_rebuy;
        case 'rebuys':
          return (b.single_rebuys + b.double_rebuys) - (a.single_rebuys + a.double_rebuys);
        case 'elimination':
          if (a.eliminated && b.eliminated) {
            return b.elimination_level - a.elimination_level;
          }
          return a.eliminated ? 1 : -1;
        default:
          return 0;
      }
    });
  };

  // Filtrar jogadores
  const filterPlayers = (players) => {
    switch (filterBy) {
      case 'active':
        return players.filter(p => !p.eliminated);
      case 'eliminated':
        return players.filter(p => p.eliminated);
      default:
        return players;
    }
  };

  const players = sortPlayers(filterPlayers(tournament.registrations));

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Jogadores</h2>
        
        <div className="flex space-x-4">
          {/* Filtros */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="rounded border-gray-300"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="eliminated">Eliminados</option>
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded border-gray-300"
          >
            <option value="stack">Stack</option>
            <option value="rebuys">Rebuys</option>
            <option value="elimination">Eliminação</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Jogador</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Stack</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Rebuys</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Add-on</th>
              <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Status</th>
              {user?.is_admin && (
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {players.map((player) => (
              <tr key={player.id} className={player.eliminated ? 'bg-gray-50' : ''}>
                <td className="px-4 py-2">
                  <div className="font-medium">
                    {player.user_name || player.user_email.split('@')[0]}
                  </div>
                  {player.eliminated && (
                    <div className="text-sm text-gray-500">
                      Eliminado no nível {player.elimination_level}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {player.eliminated ? '-' : player.stack_at_rebuy}
                </td>
                <td className="px-4 py-2 text-right">
                  <div>S: {player.single_rebuys || 0}</div>
                  <div>D: {player.double_rebuys || 0}</div>
                </td>
                <td className="px-4 py-2 text-right">
                  {player.addon_done ? 'Sim' : 'Não'}
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      player.eliminated
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {player.eliminated ? 'Eliminado' : 'Ativo'}
                  </span>
                </td>
                {user?.is_admin && (
                  <td className="px-4 py-2 text-right">
                    {!player.eliminated && tournament.current_level > tournament.addon_break_level && (
                      <button
                        onClick={() => onEliminatePlayer(player.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayersList; 