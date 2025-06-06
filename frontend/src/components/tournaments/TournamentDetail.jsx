import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';
import authService from '../../services/authService';
import TournamentTimer from './TournamentTimer';
import PlayerManagement from './PlayerManagement';

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
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {error && (
          <div className={`border px-4 py-3 rounded mb-4 relative ${
            error.includes('currently unavailable') 
              ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <strong className="font-bold">
              {error.includes('currently unavailable') ? 'Notice: ' : 'Error: '}
            </strong>
            <span className="block sm:inline">{error}</span>
            {(deleteAttempts >= 3 || error.includes('currently unavailable')) && (
              <p className="mt-2 text-sm">
                Please contact the administrator for assistance or try again later.
              </p>
            )}
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {tournament && (
          <>
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
                  Buy-in: R$ {tournament.buy_in}
                </p>
                <p className="text-gray-600">
                  Status: <span className="capitalize">{tournament.status}</span>
                </p>

                {/* Tournament Options */}
                <div className="mt-6 space-y-6">
                  {/* Bonus Information */}
                  {tournament.bonuses && tournament.bonuses.length > 0 && (
                    <>
                      <div>
                        <h3 className="text-lg font-medium mb-3">Bônus no Buy-in</h3>
                        <div className="space-y-2">
                          {tournament.bonuses.filter(b => !b.addon_bonus).map((bonus, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="font-medium text-gray-900">{bonus.name}</div>
                              <div className="text-sm text-gray-600">Stack: +{bonus.stack.toLocaleString()} chips</div>
                              <div className="text-sm text-green-600">Price: R$ {bonus.price || 0}</div>
                              <div className="text-sm text-gray-500">Condition: {bonus.condition}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {tournament.bonuses.some(b => b.addon_bonus) && (
                        <div>
                          <h3 className="text-lg font-medium mb-3">Bônus disponíveis no Add-on</h3>
                          <div className="space-y-2">
                            {tournament.bonuses.filter(b => b.addon_bonus).map((bonus, index) => (
                              <div key={index} className="bg-blue-50 p-3 rounded-lg">
                                <div className="font-medium text-blue-900">{bonus.name}</div>
                                <div className="text-sm text-blue-600">Stack: +{bonus.addon_bonus.stack.toLocaleString()} chips</div>
                                <div className="text-sm text-blue-600">Preço: R$ {bonus.addon_bonus.price || 0}</div>
                                <div className="text-sm text-gray-500">Condição: {bonus.addon_bonus.condition || 'Disponível apenas no add-on'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Add-on Information */}
                  {tournament.addon?.allowed && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Add-on Option</h3>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Stack: +{tournament.addon.stack.toLocaleString()} chips</div>
                        <div className="text-sm text-gray-600">Price: R$ {tournament.addon.price}</div>
                      </div>
                    </div>
                  )}

                  {/* Rebuy Information */}
                  {tournament.rebuy?.allowed && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Rebuy Options</h3>
                      <div className="space-y-2">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="font-medium text-gray-900">Single Rebuy</div>
                          <div className="text-sm text-gray-600">Stack: +{tournament.rebuy.single.stack.toLocaleString()} chips</div>
                          <div className="text-sm text-gray-600">Price: R$ {tournament.rebuy.single.price}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="font-medium text-gray-900">Double Rebuy</div>
                          <div className="text-sm text-gray-600">Stack: +{tournament.rebuy.double.stack.toLocaleString()} chips</div>
                          <div className="text-sm text-gray-600">Price: R$ {tournament.rebuy.double.price}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add-on Bonuses Information */}
                  {tournament.addon_bonuses && tournament.addon_bonuses.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Bônus exclusivos do Add-on</h3>
                      <div className="space-y-2">
                        {tournament.addon_bonuses.map((bonus, index) => (
                          <div key={index} className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-blue-900">{bonus.name}</div>
                            <div className="text-sm text-blue-600">Stack: +{bonus.stack.toLocaleString()} chips</div>
                            <div className="text-sm text-blue-600">Preço: R$ {bonus.price || 0}</div>
                            <div className="text-sm text-gray-500">Condição: {bonus.condition || 'Disponível apenas no add-on'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-x-2">
                {isStaff && (
                  <>
                    <button
                      onClick={handleExportResults}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Export Results
                    </button>
                    <button
                      onClick={() => handleDelete(false)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDeleting || deleteAttempts >= 3 || error?.includes('currently unavailable')}
                      title={
                        deleteAttempts >= 3
                          ? 'Maximum delete attempts reached. Please try again later.'
                          : error?.includes('currently unavailable')
                          ? 'Delete feature is currently unavailable'
                          : ''
                      }
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Tournament'}
                    </button>
                  </>
                )}
                {tournament.status === 'pending' && !hasChampion && authService.isAuthenticated() && (
                  isRegistered ? (
                    <div className="flex items-center space-x-4">
                      <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded inline-flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Already Registered
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmDialog(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Register
                    </button>
                  )
                )}
              </div>
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
          </>
        )}
      </div>
    </div>
  );
};

export default TournamentDetail;