import React from 'react';

const TournamentHistory = ({ tournament }) => {
  // Criar lista de eventos ordenada por data
  const events = tournament.registrations.flatMap(registration => {
    const playerEvents = [];
    const playerName = registration.user_name || registration.user_email.split('@')[0];

    // Adicionar rebuys
    for (let i = 0; i < (registration.single_rebuys || 0); i++) {
      playerEvents.push({
        type: 'rebuy_single',
        player: playerName,
        level: registration.last_rebuy_level,
        stack: tournament.rebuy.single.stack,
        price: tournament.rebuy.single.price
      });
    }

    for (let i = 0; i < (registration.double_rebuys || 0); i++) {
      playerEvents.push({
        type: 'rebuy_double',
        player: playerName,
        level: registration.last_rebuy_level,
        stack: tournament.rebuy.double.stack,
        price: tournament.rebuy.double.price
      });
    }

    // Adicionar add-on
    if (registration.addon_done) {
      playerEvents.push({
        type: 'addon',
        player: playerName,
        level: tournament.addon_break_level,
        stack: tournament.addon.stack,
        price: tournament.addon.price
      });
    }

    // Adicionar eliminação
    if (registration.eliminated) {
      playerEvents.push({
        type: 'elimination',
        player: playerName,
        level: registration.elimination_level
      });
    }

    return playerEvents;
  });

  // Ordenar eventos por nível
  events.sort((a, b) => b.level - a.level);

  const formatEvent = (event) => {
    switch (event.type) {
      case 'rebuy_single':
        return {
          icon: '🔄',
          text: `${event.player} fez rebuy simples no nível ${event.level}`,
          details: `+${event.stack} fichas por R$ ${event.price}`
        };
      case 'rebuy_double':
        return {
          icon: '🔄🔄',
          text: `${event.player} fez rebuy duplo no nível ${event.level}`,
          details: `+${event.stack} fichas por R$ ${event.price}`
        };
      case 'addon':
        return {
          icon: '➕',
          text: `${event.player} fez add-on no nível ${event.level}`,
          details: `+${event.stack} fichas por R$ ${event.price}`
        };
      case 'elimination':
        return {
          icon: '❌',
          text: `${event.player} foi eliminado no nível ${event.level}`,
          details: null
        };
      default:
        return null;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Histórico do Torneio</h2>

      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-gray-500">Nenhuma ação registrada ainda.</p>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {events.map((event, index) => {
                const formattedEvent = formatEvent(event);
                return (
                  <li key={index}>
                    <div className="relative pb-8">
                      {index < events.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            {formattedEvent.icon}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-800">
                              {formattedEvent.text}
                            </p>
                            {formattedEvent.details && (
                              <p className="text-sm text-gray-500">
                                {formattedEvent.details}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            Nível {event.level}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentHistory; 