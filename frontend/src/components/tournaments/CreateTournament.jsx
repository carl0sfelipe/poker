import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';
import { BLIND_STRUCTURES, getRecommendedStructure, validateBlindStructure } from '../../utils/blindStructures';

const CreateTournament = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    starting_stack: 10000,
    blind_structure: getRecommendedStructure(10000).levels,
    blind_mode: 'preset', // 'preset' ou 'custom'
    bonuses: [],
    addon: {
      allowed: false,
      stack: 0,
      price: 0
    },
    rebuy: {
      allowed: false,
      single: {
        stack: 0,
        price: 0
      },
      double: {
        stack: 0,
        price: 0
      }
    }
  });
  const [error, setError] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('small');
  const [newBonus, setNewBonus] = useState({ name: '', stack: 0, condition: '' });

  useEffect(() => {
    if (formData.blind_mode === 'preset') {
      const structure = getRecommendedStructure(formData.starting_stack);
      setFormData(prev => ({
        ...prev,
        blind_structure: structure.levels
      }));
      setSelectedPreset(formData.starting_stack <= 15000 ? 'small' : formData.starting_stack <= 25000 ? 'medium' : 'large');
    }
  }, [formData.starting_stack, formData.blind_mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validar estrutura de blinds
    const validation = validateBlindStructure(formData.blind_structure, formData.starting_stack);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      await tournamentService.create(formData);
      navigate('/tournaments');
    } catch (err) {
      setError('Failed to create tournament');
    }
  };

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    setFormData({
      ...formData,
      blind_structure: BLIND_STRUCTURES[presetKey].levels
    });
  };

  const addBlindLevel = () => {
    const lastLevel = formData.blind_structure[formData.blind_structure.length - 1];
    setFormData({
      ...formData,
      blind_structure: [
        ...formData.blind_structure,
        {
          level: lastLevel.level + 1,
          small_blind: lastLevel.small_blind * 2,
          big_blind: lastLevel.big_blind * 2,
          duration: lastLevel.duration
        }
      ]
    });
  };

  const removeBlindLevel = (index) => {
    const newLevels = formData.blind_structure.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      blind_structure: newLevels.map((level, i) => ({ ...level, level: i + 1 }))
    });
  };

  const handleNumberChange = (value, field, index = null) => {
    const numValue = value === '' ? 0 : parseInt(value);
    if (isNaN(numValue)) return;

    if (index !== null) {
      const newLevels = [...formData.blind_structure];
      newLevels[index][field] = numValue;
      setFormData({
        ...formData,
        blind_structure: newLevels
      });
    } else {
      setFormData({ ...formData, [field]: numValue });
    }
  };

  const handleBonusAdd = () => {
    // Validate name (3+ alphanumeric chars)
    const validName = newBonus.name.trim().length >= 3 && /^[a-zA-Z0-9\s]+$/.test(newBonus.name.trim());
    
    // Validate condition (5+ chars)
    const validCondition = newBonus.condition.trim().length >= 5;
    
    // Validate stack (positive number)
    const validStack = Number.isInteger(newBonus.stack) && newBonus.stack > 0;

    if (!validName || !validCondition || !validStack) {
      setError(
        'Invalid bonus: ' +
        (!validName ? 'Name must be 3+ alphanumeric characters. ' : '') +
        (!validCondition ? 'Condition must be 5+ characters. ' : '') +
        (!validStack ? 'Stack must be a positive number.' : '')
      );
      return;
    }

    setFormData({
      ...formData,
      bonuses: [...formData.bonuses, {
        name: newBonus.name.trim(),
        stack: parseInt(newBonus.stack),
        condition: newBonus.condition.trim()
      }]
    });
    setNewBonus({ name: '', stack: 0, condition: '' });
    setError(null);
  };

  const handleBonusRemove = (index) => {
    setFormData({
      ...formData,
      bonuses: formData.bonuses.filter((_, i) => i !== index)
    });
  };

  const handleAddonToggle = (enabled) => {
    setFormData({
      ...formData,
      addon: {
        allowed: enabled,
        stack: enabled ? formData.addon.stack : 0,
        price: enabled ? formData.addon.price : 0
      }
    });
  };

  const handleRebuyToggle = (enabled) => {
    setFormData({
      ...formData,
      rebuy: {
        allowed: enabled,
        single: {
          stack: enabled ? formData.rebuy.single.stack : 0,
          price: enabled ? formData.rebuy.single.price : 0
        },
        double: {
          stack: enabled ? formData.rebuy.double.stack : 0,
          price: enabled ? formData.rebuy.double.price : 0
        }
      }
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create Tournament</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Time</label>
          <input
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Starting Stack</label>
          <input
            type="number"
            min="1000"
            step="1000"
            value={formData.starting_stack}
            onChange={(e) => handleNumberChange(e.target.value, 'starting_stack')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Blind Structure Mode</label>
          <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="preset"
                checked={formData.blind_mode === 'preset'}
                onChange={(e) => setFormData({ ...formData, blind_mode: e.target.value })}
                className="form-radio"
              />
              <span className="ml-2">Use Preset</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="custom"
                checked={formData.blind_mode === 'custom'}
                onChange={(e) => setFormData({ ...formData, blind_mode: e.target.value })}
                className="form-radio"
              />
              <span className="ml-2">Custom Structure</span>
            </label>
          </div>

          {formData.blind_mode === 'preset' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Preset</label>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="small">{BLIND_STRUCTURES.small.name}</option>
                <option value="medium">{BLIND_STRUCTURES.medium.name}</option>
                <option value="large">{BLIND_STRUCTURES.large.name}</option>
              </select>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Blind Levels</h3>
              {formData.blind_mode === 'custom' && (
                <button
                  type="button"
                  onClick={addBlindLevel}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Level
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Small Blind</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Big Blind</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration (min)</th>
                    {formData.blind_mode === 'custom' && (
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.blind_structure.map((level, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">{level.level}</td>
                      <td className="px-4 py-2">
                        {formData.blind_mode === 'custom' ? (
                          <input
                            type="number"
                            min="1"
                            value={level.small_blind}
                            onChange={(e) => handleNumberChange(e.target.value, 'small_blind', index)}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          level.small_blind
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {formData.blind_mode === 'custom' ? (
                          <input
                            type="number"
                            min="1"
                            value={level.big_blind}
                            onChange={(e) => handleNumberChange(e.target.value, 'big_blind', index)}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          level.big_blind
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {formData.blind_mode === 'custom' ? (
                          <input
                            type="number"
                            min="1"
                            value={level.duration}
                            onChange={(e) => handleNumberChange(e.target.value, 'duration', index)}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          level.duration
                        )}
                      </td>
                      {formData.blind_mode === 'custom' && (
                        <td className="px-4 py-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeBlindLevel(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-8">
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Bonus Options</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Bonus Name"
                  value={newBonus.name}
                  onChange={(e) => setNewBonus({ ...newBonus, name: e.target.value })}
                  className="flex-1 rounded-md border-gray-300"
                />
                <input
                  type="number"
                  placeholder="Stack Amount"
                  value={newBonus.stack}
                  onChange={(e) => setNewBonus({ ...newBonus, stack: parseInt(e.target.value) || 0 })}
                  className="w-32 rounded-md border-gray-300"
                />
                <input
                  type="text"
                  placeholder="Condition"
                  value={newBonus.condition}
                  onChange={(e) => setNewBonus({ ...newBonus, condition: e.target.value })}
                  className="flex-1 rounded-md border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleBonusAdd}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add Bonus
                </button>
              </div>
            </div>
            
            {formData.bonuses.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Added Bonuses:</h4>
                <div className="space-y-2">
                  {formData.bonuses.map((bonus, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-medium">{bonus.name}</span>
                        <span className="mx-2">-</span>
                        <span>{bonus.stack.toLocaleString()} chips</span>
                        <span className="mx-2">-</span>
                        <span className="text-gray-600">{bonus.condition}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBonusRemove(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Add-on Options</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.addon.allowed}
                  onChange={(e) => handleAddonToggle(e.target.checked)}
                  className="mr-2"
                />
                <span>Enable Add-on</span>
              </div>
              
              {formData.addon.allowed && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stack Amount</label>
                    <input
                      type="number"
                      value={formData.addon.stack}
                      onChange={(e) => setFormData({
                        ...formData,
                        addon: { ...formData.addon, stack: parseInt(e.target.value) || 0 }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                      type="number"
                      value={formData.addon.price}
                      onChange={(e) => setFormData({
                        ...formData,
                        addon: { ...formData.addon, price: parseInt(e.target.value) || 0 }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Rebuy Options</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rebuy.allowed}
                  onChange={(e) => handleRebuyToggle(e.target.checked)}
                  className="mr-2"
                />
                <span>Enable Rebuys</span>
              </div>
              
              {formData.rebuy.allowed && (
                <>
                  <div>
                    <h4 className="text-md font-medium mb-2">Single Rebuy</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Stack Amount</label>
                        <input
                          type="number"
                          value={formData.rebuy.single.stack}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              single: { ...formData.rebuy.single, stack: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price</label>
                        <input
                          type="number"
                          value={formData.rebuy.single.price}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              single: { ...formData.rebuy.single, price: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium mb-2">Double Rebuy</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Stack Amount</label>
                        <input
                          type="number"
                          value={formData.rebuy.double.stack}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              double: { ...formData.rebuy.double, stack: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price</label>
                        <input
                          type="number"
                          value={formData.rebuy.double.price}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              double: { ...formData.rebuy.double, price: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/tournaments')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create Tournament
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTournament; 