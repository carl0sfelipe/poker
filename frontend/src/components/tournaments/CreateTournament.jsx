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
    blind_mode: 'preset' // 'preset' ou 'custom'
  });
  const [error, setError] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('small');

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