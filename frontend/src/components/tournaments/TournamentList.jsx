import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';
import authService from '../../services/authService';

const TournamentList = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isStaff = authService.isStaff();

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentService.list();
      setTournaments(data);
    } catch (err) {
      console.error('Error loading tournaments:', err);
      setError(err.response?.data?.message || 'Failed to load tournaments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={loadTournaments}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        {isStaff && (
          <Link
            to="/tournaments/create"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Tournament
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No tournaments found.</p>
          {isStaff && (
            <Link
              to="/tournaments/create"
              className="inline-block mt-4 text-blue-500 hover:text-blue-600"
            >
              Create your first tournament
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{tournament.name}</h2>
              <p className="text-gray-600">
                Start: {new Date(tournament.start_time).toLocaleString()}
              </p>
              <p className="text-gray-600">
                Stack: {tournament.starting_stack.toLocaleString()}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Buy-in:</span> R$ {tournament.buy_in}
              </p>
              
              {/* Mostrar informação dos bônus */}
              {tournament.bonuses && tournament.bonuses.length > 0 && (
                <div className="mt-2">
                  <p className="text-gray-600 font-medium">Bonuses:</p>
                  <ul className="text-sm text-gray-500 ml-4 mt-1">
                    {tournament.bonuses.map((bonus, idx) => (
                      <li key={idx}>
                        {bonus.name} (+{bonus.stack.toLocaleString()} chips)
                        {bonus.price > 0 && <span className="text-green-600"> - R$ {bonus.price}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="text-gray-600 mt-2">
                Status: <span className="capitalize">{tournament.status}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentList;