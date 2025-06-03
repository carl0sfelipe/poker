import React, { useState, useEffect } from 'react';
import tournamentService from '../../services/tournamentService';
import authService from '../../services/authService';

const PlayerManagement = ({ tournamentId }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isStaff = authService.isStaff();

  useEffect(() => {
    if (!isStaff) {
      setError('Unauthorized access');
      setLoading(false);
      return;
    }
    loadPlayers();
  }, [tournamentId, isStaff]);

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
    if (!isStaff) return;
    try {
      await tournamentService.checkIn(tournamentId, userId);
      loadPlayers();
    } catch (err) {
      setError('Failed to check in player');
    }
  };

  const handleEliminate = async (userId) => {
    if (!isStaff) return;
    try {
      await tournamentService.eliminate(tournamentId, userId);
      loadPlayers();
    } catch (err) {
      setError('Failed to eliminate player');
    }
  };

  if (!isStaff) return null;
  if (loading) return <div className="text-center p-4">Loading players...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Player Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {players.map((registration) => (
              <tr key={registration.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {registration.user?.email || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {registration.checked_in ? 'Checked In' : 'Registered'}
                  {registration.finish_place && ` - Finished ${registration.finish_place}th`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {!registration.checked_in && (
                    <button
                      onClick={() => handleCheckIn(registration.user_id)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Check In
                    </button>
                  )}
                  {registration.checked_in && !registration.finish_place && (
                    <button
                      onClick={() => handleEliminate(registration.user_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminate
                    </button>
                  )}
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