import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';

const CreateTournament = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    starting_stack: 10000,
    blind_structure: {
      levels: [
        { level: 1, small_blind: 25, big_blind: 50, duration: 20 }
      ]
    }
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tournamentService.create(formData);
      navigate('/tournaments');
    } catch (err) {
      setError('Failed to create tournament');
    }
  };

  const addBlindLevel = () => {
    const lastLevel = formData.blind_structure.levels[formData.blind_structure.levels.length - 1];
    setFormData({
      ...formData,
      blind_structure: {
        levels: [
          ...formData.blind_structure.levels,
          {
            level: lastLevel.level + 1,
            small_blind: lastLevel.small_blind * 2,
            big_blind: lastLevel.big_blind * 2,
            duration: 20
          }
        ]
      }
    });
  };

  const handleNumberChange = (value, field, index = null) => {
    const numValue = value === '' ? 0 : parseInt(value);
    if (isNaN(numValue)) return;

    if (index !== null) {
      const newLevels = [...formData.blind_structure.levels];
      newLevels[index][field] = numValue;
      setFormData({
        ...formData,
        blind_structure: { levels: newLevels }
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
            min="0"
            value={formData.starting_stack}
            onChange={(e) => handleNumberChange(e.target.value, 'starting_stack')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Blind Structure</label>
            <button
              type="button"
              onClick={addBlindLevel}
              className="text-blue-500 hover:text-blue-600"
            >
              Add Level
            </button>
          </div>
          
          <div className="space-y-2">
            {formData.blind_structure.levels.map((level, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  min="0"
                  value={level.small_blind}
                  onChange={(e) => handleNumberChange(e.target.value, 'small_blind', index)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Small Blind"
                />
                <input
                  type="number"
                  min="0"
                  value={level.big_blind}
                  onChange={(e) => handleNumberChange(e.target.value, 'big_blind', index)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Big Blind"
                />
                <input
                  type="number"
                  min="1"
                  value={level.duration}
                  onChange={(e) => handleNumberChange(e.target.value, 'duration', index)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Duration (min)"
                />
              </div>
            ))}
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