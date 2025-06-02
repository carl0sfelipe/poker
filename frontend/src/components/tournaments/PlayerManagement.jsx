import React, { useState, useEffect } from 'react';
import tournamentService from '../../services/tournamentService';

const PlayerManagement = ({ tournamentId }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPlayers();
  }, [tournamentId]);

  const loadPlayers = async () => {
    try {
      const data = await tournamentService.getById(tournamentId);
      setPlayers(data.registrations || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load players');
      setLoading(false);
    }
  };

  const handleCheckIn = async (userId) => {
    try {
      await tournamentService.checkIn(tournamentId, userId);
      loadPlayers();
    } catch (err) {
      setError('Failed to check in player');
    }
  };

  const handleEliminate = async (userId) => {
    try {
      await tournamentService.eliminate(tournamentId, userId);
      loadPlayers();
    } catch (err) {
      setError('Failed to eliminate player');
    }
  };

  if (loading) return <div className="text-center p-4">Loading players...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Player Management</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 text-left">Player</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Table</th>
              <th className="px-6 py-3 text-left">Seat</th>
              <th className="px-6 py-3 text-left">Place</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-b">
                <td className="px-6 py-4">{player.user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded ${
                      player.checked_in
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {player.checked_in ? 'Checked In' : 'Registered'}
                  </span>
                </td>
                <td className="px-6 py-4">{player.table_number || '-'}</td>
                <td className="px-6 py-4">{player.seat_number || '-'}</td>
                <td className="px-6 py-4">{player.finish_place || '-'}</td>
                <td className="px-6 py-4">
                  <div className="space-x-2">
                    {!player.checked_in && (
                      <button
                        onClick={() => handleCheckIn(player.user.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Check In
                      </button>
                    )}
                    {player.checked_in && !player.finish_place && (
                      <button
                        onClick={() => handleEliminate(player.user.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerManagement; 