import React from 'react';

const TournamentStats = ({ tournament }) => {
  // Calcular estatísticas
  const totalPlayers = tournament.registrations.length;
  const activePlayers = tournament.registrations.filter(r => !r.eliminated).length;
  const eliminatedPlayers = tournament.registrations.filter(r => r.eliminated).length;
  
  const totalSingleRebuys = tournament.registrations.reduce((sum, r) => sum + (r.single_rebuys || 0), 0);
  const totalDoubleRebuys = tournament.registrations.reduce((sum, r) => sum + (r.double_rebuys || 0), 0);
  const totalAddons = tournament.registrations.filter(r => r.addon_done).length;

  const totalRebuyRevenue = (
    (totalSingleRebuys * tournament.rebuy.single.price) +
    (totalDoubleRebuys * tournament.rebuy.double.price)
  );
  const totalAddonRevenue = totalAddons * tournament.addon.price;
  const totalRevenue = totalRebuyRevenue + totalAddonRevenue;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Estatísticas do Torneio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estatísticas de Jogadores */}
        <div>
          <h3 className="text-lg font-medium mb-3">Jogadores</h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Total:</span> {totalPlayers}
            </p>
            <p>
              <span className="font-medium">Ativos:</span>{' '}
              <span className="text-green-600">{activePlayers}</span>
            </p>
            <p>
              <span className="font-medium">Eliminados:</span>{' '}
              <span className="text-red-600">{eliminatedPlayers}</span>
            </p>
          </div>
        </div>

        {/* Estatísticas de Rebuys e Add-ons */}
        <div>
          <h3 className="text-lg font-medium mb-3">Rebuys e Add-ons</h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Rebuys Simples:</span> {totalSingleRebuys}
            </p>
            <p>
              <span className="font-medium">Rebuys Duplos:</span> {totalDoubleRebuys}
            </p>
            <p>
              <span className="font-medium">Add-ons:</span> {totalAddons}
            </p>
          </div>
        </div>

        {/* Estatísticas Financeiras */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium mb-3">Receita</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Rebuys</p>
              <p className="text-lg font-medium">R$ {totalRebuyRevenue}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Add-ons</p>
              <p className="text-lg font-medium">R$ {totalAddonRevenue}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-blue-600">Total</p>
              <p className="text-lg font-medium text-blue-700">R$ {totalRevenue}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentStats; 