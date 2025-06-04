import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import tournamentService from '../../services/tournamentService';

const SettleUpModal = ({ isOpen, onClose, registration, tournament }) => {
  const [includeAddon, setIncludeAddon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const calculateTotalDue = () => {
    let total = 0;
    total += (registration.single_rebuys || 0) * tournament.rebuy.single.price;
    total += (registration.double_rebuys || 0) * tournament.rebuy.double.price;

    if (includeAddon) {
      total += tournament.addon.price;
    }

    return total;
  };

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      if (includeAddon) {
        await tournamentService.performAddon(tournament.id, registration.user_id);
      }

      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={() => !isProcessing && onClose()} className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <Dialog.Title className="text-lg font-medium mb-4">Settle Up</Dialog.Title>
          <div className="space-y-4">
            {(registration.single_rebuys > 0 || registration.double_rebuys > 0) && (
              <div>
                <h3 className="font-medium mb-2">Rebuy Summary</h3>
                {registration.single_rebuys > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Single Rebuys ({registration.single_rebuys}x)</span>
                    <span>R$ {registration.single_rebuys * tournament.rebuy.single.price}</span>
                  </div>
                )}
                {registration.double_rebuys > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Double Rebuys ({registration.double_rebuys}x)</span>
                    <span>R$ {registration.double_rebuys * tournament.rebuy.double.price}</span>
                  </div>
                )}
              </div>
            )}
            {tournament.addon.allowed && !registration.eliminated && !registration.addon_done && (
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
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between font-medium">
                <span>Total Due</span>
                <span>R$ {calculateTotalDue()}</span>
              </div>
            </div>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => onClose(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SettleUpModal;
