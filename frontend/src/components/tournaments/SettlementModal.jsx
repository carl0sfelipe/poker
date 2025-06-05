import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import tournamentService from '../../services/tournamentService';

const SettlementModal = ({ isOpen, onClose, player, tournament }) => {
  const [includeAddon, setIncludeAddon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const calculateTotalDue = () => {
    let total = 0;
    
    // Calculate rebuy costs
    if (!player.rebuys_paid) {
      total += (player.single_rebuys || 0) * tournament.rebuy.single.price;
      total += (player.double_rebuys || 0) * tournament.rebuy.double.price;
    }

    // Add addon cost if selected
    if (includeAddon && !player.addon_used) {
      total += tournament.addon.price;
    }

    return total;
  };

  const handleSettlement = async (confirmPayment) => {
    try {
      setIsProcessing(true);
      setError(null);

      await tournamentService.settlePayment(tournament.id, player.user_id, {
        confirmPayment,
        includeAddon: confirmPayment && includeAddon
      });

      onClose(true); // Close with refresh flag
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-10 inset-0 overflow-y-auto"
        onClose={() => !isProcessing && onClose()}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black opacity-30" />
        </Transition.Child>

        <div className="flex items-center justify-center min-h-screen">
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <Dialog.Title className="text-lg font-medium mb-4">
            Payment Settlement - {player.user_name || player.user_email}
          </Dialog.Title>

          <div className="space-y-4">
            {/* Rebuy Summary */}
            {(player.single_rebuys > 0 || player.double_rebuys > 0) && !player.rebuys_paid && (
              <div>
                <h3 className="font-medium mb-2">Rebuy Summary</h3>
                {player.single_rebuys > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Single Rebuys ({player.single_rebuys}x)</span>
                    <span>R$ {player.single_rebuys * tournament.rebuy.single.price}</span>
                  </div>
                )}
                {player.double_rebuys > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Double Rebuys ({player.double_rebuys}x)</span>
                    <span>R$ {player.double_rebuys * tournament.rebuy.double.price}</span>
                  </div>
                )}
              </div>
            )}

            {/* Add-on Option */}
            {tournament.addon.allowed && 
             tournament.current_level === tournament.addon_break_level && 
             !player.addon_used && (
              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="include-addon"
                  checked={includeAddon}
                  onChange={(e) => setIncludeAddon(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="include-addon" className="text-sm">
                  Include Add-on (+R$ {tournament.addon.price})
                </label>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between font-medium">
                <span>Total Due</span>
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
                onClick={() => handleSettlement(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminate Player
              </button>
              <button
                onClick={() => handleSettlement(true)}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
    </Transition>
  );
};

export default SettlementModal; 