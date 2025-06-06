import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop } from '@headlessui/react';
import tournamentService from '../../services/tournamentService';

const SettlementModal = ({ isOpen, onClose, player, tournament }) => {
  const [includeAddon, setIncludeAddon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para rebuys
  const [editedSingleRebuys, setEditedSingleRebuys] = useState(player?.single_rebuys || 0);
  const [editedDoubleRebuys, setEditedDoubleRebuys] = useState(player?.double_rebuys || 0);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para buy-in e bônus
  const [buyInPaid, setBuyInPaid] = useState(player?.buy_in_paid || false);
  const [selectedBonuses, setSelectedBonuses] = useState([]);
  const [selectedBonusAddons, setSelectedBonusAddons] = useState([]);
  
  // Atualiza os estados quando o player muda
  useEffect(() => {
    setEditedSingleRebuys(player?.single_rebuys || 0);
    setEditedDoubleRebuys(player?.double_rebuys || 0);
    setBuyInPaid(player?.buy_in_paid || false);
    setSelectedBonuses(player?.selected_bonuses || []);
    setSelectedBonusAddons(player?.bonus_addons_used || []);
  }, [player]);

  const calculateTotalDue = () => {
    let total = 0;

    // Adiciona valor do buy-in se não estiver marcado como já pago
    if (!buyInPaid) {
      total += Number(tournament?.buy_in || 0);
    }

    // Adiciona valor dos bônus selecionados
    if (tournament?.bonuses?.length > 0 && selectedBonuses.length > 0) {
      tournament.bonuses.forEach(bonus => {
        if (selectedBonuses.includes(bonus.name)) {
          total += Number(bonus.price || 0);
          
          // Adiciona o valor do addon do bônus se estiver selecionado
          if (bonus.addon && selectedBonusAddons.includes(bonus.name)) {
            total += Number(bonus.addon.price || 0);
          }
        }
      });
    }

    // Adiciona valor dos rebuys se não estiverem pagos
    if (!player.rebuys_paid) {
      total += editedSingleRebuys * Number(tournament?.rebuy?.single?.price || 0);
      total += editedDoubleRebuys * Number(tournament?.rebuy?.double?.price || 0);
    }

    // Adiciona valor do addon se aplicável
    if ((player.addon_used && !player.addon_paid) || (includeAddon && !player.addon_used)) {
      total += Number(tournament?.addon?.price || 0);
    }

    // Add-on bonuses exclusivos
    if (tournament?.addon_bonuses?.length > 0 && includeAddon && selectedBonusAddons.length > 0) {
      tournament.addon_bonuses.forEach(bonus => {
        if (selectedBonusAddons.includes(bonus.name)) {
          total += Number(bonus.price || 0);
        }
      });
    }

    return total;
  };

  const handleSettlement = async (confirmPayment) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Se editou os rebuys, primeiro atualiza os valores
      if (isEditing && (editedSingleRebuys !== player.single_rebuys || editedDoubleRebuys !== player.double_rebuys)) {
        await tournamentService.updateRebuyCount(tournament.id, player.user_id, {
          singleRebuys: editedSingleRebuys,
          doubleRebuys: editedDoubleRebuys
        });
      }

      await tournamentService.settlePayment(tournament.id, player.user_id, {
        confirmPayment,
        includeAddon: confirmPayment && includeAddon,
        includeBuyIn: !buyInPaid,
        selectedBonuses: confirmPayment ? selectedBonuses : [],
        selectedBonusAddons: confirmPayment ? selectedBonusAddons : []
      });

      onClose(true); // Close with refresh flag
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      // Quando entra no modo de edição, inicializa com os valores atuais
      setEditedSingleRebuys(player.single_rebuys || 0);
      setEditedDoubleRebuys(player.double_rebuys || 0);
    }
  };

  const handleBonusToggle = (bonusName) => {
    if (selectedBonuses.includes(bonusName)) {
      setSelectedBonuses(selectedBonuses.filter(b => b !== bonusName));
    } else {
      setSelectedBonuses([...selectedBonuses, bonusName]);
    }
  };

  const handleBonusAddonToggle = (bonusName) => {
    if (selectedBonusAddons.includes(bonusName)) {
      setSelectedBonusAddons(selectedBonusAddons.filter(b => b !== bonusName));
    } else {
      setSelectedBonusAddons([...selectedBonusAddons, bonusName]);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isProcessing && onClose()}
      className="fixed z-10 inset-0 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <DialogBackdrop className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <button
            onClick={() => !isProcessing && onClose()}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            &times;
          </button>
          <Dialog.Title className="text-lg font-medium mb-4">
            Payment Settlement - {player.user_name || player.user_email}
          </Dialog.Title>

          <div className="space-y-4">
            {/* Buy-in Option */}
            {tournament.buy_in > 0 && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <div className="font-medium">Buy-in</div>
                    <div className="text-xs text-gray-500">Taxa de inscrição</div>
                  </div>
                  <div className="text-green-600 text-sm mr-4">
                    R$ {tournament.buy_in}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="buyin-paid"
                      checked={buyInPaid}
                      onChange={(e) => setBuyInPaid(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="buyin-paid" className="text-sm text-gray-600 whitespace-nowrap">
                      Já pago
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Bonuses Selection - logo abaixo do buy-in */}
            {tournament.bonuses && tournament.bonuses.filter(bonus => bonus.price > 0 && !bonus.addon_bonus).length > 0 && (
              <div className="pt-2">
                <div className="space-y-2">
                  {tournament.bonuses
                    .filter(bonus => bonus.price > 0 && !bonus.addon_bonus)
                    .map(bonus => (
                      <div key={bonus.name} className="flex flex-col border-t pt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-grow">
                            <div className="font-medium">{bonus.name}</div>
                            <div className="text-xs text-gray-500">+{bonus.stack.toLocaleString()} chips</div>
                          </div>
                          <div className="text-green-600 text-sm mr-4">
                            R$ {bonus.price}
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`bonus-paid-${bonus.name}`}
                              checked={selectedBonuses.includes(bonus.name)}
                              onChange={() => handleBonusToggle(bonus.name)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`bonus-paid-${bonus.name}`} className="text-sm text-gray-600 whitespace-nowrap">
                              Já pago
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Add-on Option */}
            {tournament.addon?.allowed && !player.addon_used && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <div className="font-medium">Add-on</div>
                    <div className="text-xs text-gray-500">+{tournament.addon.stack.toLocaleString()} chips</div>
                  </div>
                  <div className="text-green-600 text-sm mr-4">
                    R$ {tournament.addon.price}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-addon"
                      checked={includeAddon}
                      onChange={(e) => setIncludeAddon(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="include-addon" className="text-sm text-gray-600 whitespace-nowrap">
                      Incluir
                    </label>
                  </div>
                </div>
                {/* Bônus de add-on só aparecem se o add-on for selecionado */}
                {includeAddon && tournament.bonuses && tournament.bonuses.filter(b => b.addon_bonus).length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium mb-2 text-blue-900">Bônus disponíveis no Add-on</div>
                    <div className="space-y-2">
                      {tournament.bonuses.filter(b => b.addon_bonus).map(bonus => (
                        <div key={bonus.name} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                          <div>
                            <div className="font-medium">{bonus.name}</div>
                            <div className="text-xs text-blue-600">+{bonus.addon_bonus.stack.toLocaleString()} chips</div>
                          </div>
                          <div className="text-blue-600 text-sm mr-4">
                            R$ {bonus.addon_bonus.price || 0}
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`addon-bonus-${bonus.name}`}
                              checked={selectedBonusAddons.includes(bonus.name)}
                              onChange={() => handleBonusAddonToggle(bonus.name)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`addon-bonus-${bonus.name}`} className="text-sm text-blue-900 whitespace-nowrap">
                              Incluir
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add-on Bonuses exclusivos */}
            {tournament.addon_bonuses && tournament.addon_bonuses.length > 0 && includeAddon && (
              <div className="mt-4">
                <div className="font-medium mb-2 text-blue-900">Bônus exclusivos do Add-on</div>
                <div className="space-y-2">
                  {tournament.addon_bonuses.map(bonus => (
                    <div key={bonus.name} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                      <div>
                        <div className="font-medium">{bonus.name}</div>
                        <div className="text-xs text-blue-600">+{bonus.stack.toLocaleString()} chips</div>
                      </div>
                      <div className="text-blue-600 text-sm mr-4">
                        R$ {bonus.price || 0}
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`addon-bonus-exclusive-${bonus.name}`}
                          checked={selectedBonusAddons.includes(bonus.name)}
                          onChange={() => handleBonusAddonToggle(bonus.name)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`addon-bonus-exclusive-${bonus.name}`} className="text-sm text-blue-900 whitespace-nowrap">
                          Incluir
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rebuy Summary com opção de editar - melhorado para seguir o padrão visual */}
            {((player.single_rebuys > 0 || player.double_rebuys > 0) || isEditing) && !player.rebuys_paid && (
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">Rebuys</div>
                  <button 
                    onClick={toggleEditMode}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {isEditing ? "Concluir" : "Editar"}
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-grow">
                          <div className="font-medium">Single Rebuy</div>
                          <div className="text-xs text-gray-500">+{tournament.rebuy.single.stack.toLocaleString()} chips</div>
                        </div>
                      </div>
                      <div className="text-green-600 text-sm mr-4">
                        R$ {tournament.rebuy.single.price}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setEditedSingleRebuys(Math.max(0, editedSingleRebuys - 1))}
                          className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                          disabled={editedSingleRebuys <= 0}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={editedSingleRebuys}
                          onChange={(e) => setEditedSingleRebuys(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-12 text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button 
                          onClick={() => setEditedSingleRebuys(editedSingleRebuys + 1)}
                          className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-grow">
                          <div className="font-medium">Double Rebuy</div>
                          <div className="text-xs text-gray-500">+{tournament.rebuy.double.stack.toLocaleString()} chips</div>
                        </div>
                      </div>
                      <div className="text-green-600 text-sm mr-4">
                        R$ {tournament.rebuy.double.price}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setEditedDoubleRebuys(Math.max(0, editedDoubleRebuys - 1))}
                          className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                          disabled={editedDoubleRebuys <= 0}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={editedDoubleRebuys}
                          onChange={(e) => setEditedDoubleRebuys(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-12 text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button 
                          onClick={() => setEditedDoubleRebuys(editedDoubleRebuys + 1)}
                          className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="font-medium">Total Rebuys</span>
                      <span className="text-green-600">
                        R$ {(editedSingleRebuys * tournament.rebuy.single.price) + 
                            (editedDoubleRebuys * tournament.rebuy.double.price)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {player.single_rebuys > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex-grow">
                          <div className="font-medium">Single Rebuys ({player.single_rebuys}x)</div>
                          <div className="text-xs text-gray-500">+{player.single_rebuys * tournament.rebuy.single.stack} chips</div>
                        </div>
                        <span className="text-green-600 text-sm">
                          R$ {player.single_rebuys * tournament.rebuy.single.price}
                        </span>
                      </div>
                    )}
                    {player.double_rebuys > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex-grow">
                          <div className="font-medium">Double Rebuys ({player.double_rebuys}x)</div>
                          <div className="text-xs text-gray-500">+{player.double_rebuys * tournament.rebuy.double.stack} chips</div>
                        </div>
                        <span className="text-green-600 text-sm">
                          R$ {player.double_rebuys * tournament.rebuy.double.price}
                        </span>
                      </div>
                    )}
                    {(player.single_rebuys > 0 || player.double_rebuys > 0) && (
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="font-medium">Total Rebuys</span>
                        <span className="text-green-600">
                          R$ {(player.single_rebuys * tournament.rebuy.single.price) + 
                             (player.double_rebuys * tournament.rebuy.double.price)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>R$ {calculateTotalDue()}</span>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => handleSettlement(true)}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SettlementModal;