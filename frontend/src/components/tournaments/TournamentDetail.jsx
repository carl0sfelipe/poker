import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';
import TournamentTimer from './TournamentTimer';
import PlayerManagement from './PlayerManagement';

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      const data = await tournamentService.getById(id);
      setTournament(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load tournament');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      await tournamentService.register(id);
      setIsRegistered(true);
      loadTournament(); // Refresh tournament data
    } catch (err) {
      setError('Failed to register for tournament');
    }
  };

  const handleExportResults = async () => {
    try {
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
      setError('Failed to export results');
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!tournament) return <div className="text-center p-4">Tournament not found</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
            <p className="text-gray-600">
              Start: {new Date(tournament.start_time).toLocaleString()}
            </p>
            <p className="text-gray-600">
              Starting Stack: {tournament.starting_stack.toLocaleString()}
            </p>
            <p className="text-gray-600">
              Status: <span className="capitalize">{tournament.status}</span>
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleExportResults}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export Results
            </button>
            {!isRegistered && tournament.status === 'pending' && (
              <button
                onClick={handleRegister}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Register
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Blind Structure</h2>
            <div className="space-y-2">
              {tournament.blind_structure.levels.map((level) => (
                <div
                  key={level.level}
                  className="flex justify-between p-2 bg-gray-50 rounded"
                >
                  <span>Level {level.level}</span>
                  <span>
                    {level.small_blind}/{level.big_blind}
                  </span>
                  <span>{level.duration} min</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <TournamentTimer
              blindStructure={tournament.blind_structure}
              startTime={tournament.start_time}
            />
          </div>
        </div>

        <div className="mt-8">
          <PlayerManagement tournamentId={id} />
        </div>
      </div>
    </div>
  );
};

export default TournamentDetail; 