import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';
import { BLIND_STRUCTURES, getRecommendedStructure, validateBlindStructure } from '../../utils/blindStructures';

// Função para arredondar para o número mais próximo que seja fácil para o dealer
function roundToNiceNumber(number) {
  // Para valores até 1000
  if (number <= 100) return 100;
  if (number <= 200) return 200;
  if (number <= 300) return 300;
  if (number <= 400) return 400;
  if (number <= 500) return 500;
  if (number <= 600) return 600;
  if (number <= 800) return 800;
  if (number <= 1000) return 1000;
  
  // Para valores até 5000
  if (number <= 1500) return 1500;
  if (number <= 2000) return 2000;
  if (number <= 2500) return 2500;
  if (number <= 3000) return 3000;
  if (number <= 4000) return 4000;
  if (number <= 5000) return 5000;
  
  // Para valores até 10000
  if (number <= 6000) return 6000;
  if (number <= 8000) return 8000;
  if (number <= 10000) return 10000;
  
  // Para valores até 100000
  if (number <= 15000) return 15000;
  if (number <= 20000) return 20000;
  if (number <= 25000) return 25000;
  if (number <= 30000) return 30000;
  if (number <= 40000) return 40000;
  if (number <= 50000) return 50000;
  if (number <= 60000) return 60000;
  if (number <= 80000) return 80000;
  if (number <= 100000) return 100000;
  
  // Para valores até 500000
  if (number <= 150000) return 150000;
  if (number <= 200000) return 200000;
  if (number <= 300000) return 300000;
  if (number <= 400000) return 400000;
  if (number <= 500000) return 500000;
  
  // Para valores maiores, arredonda para o múltiplo de 100000 mais próximo
  return Math.round(number / 100000) * 100000;
}

const CreateTournament = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    starting_stack: 10000,
    blind_structure: getRecommendedStructure(10000).levels,
    blind_mode: 'preset', // 'preset' ou 'custom'
    bonuses: [],
    break_level: 6, // Nível padrão para o intervalo
    addon: {
      allowed: false,
      stack: 0,
      price: 0
    },
    rebuy: {
      allowed: false,
      max_stack_for_single: 0,
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
  const [currentPage, setCurrentPage] = useState(1);
  const levelsPerPage = 10;

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
      if (formData.rebuy.allowed) {
        // Validate rebuy settings
        if (formData.rebuy.max_stack_for_single <= 0) {
          setError('Stack máximo para rebuy simples deve ser maior que 0');
          return;
        }
      }

      const response = await tournamentService.create(formData);
      navigate(`/tournaments/${response.id}`);
    } catch (err) {
      setError(err.message);
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
    const newSmallBlind = Math.round(lastLevel.small_blind * 1.25);
    const roundedSmallBlind = roundToNiceNumber(newSmallBlind);
    
    setFormData({
      ...formData,
      blind_structure: [
        ...formData.blind_structure,
        {
          level: lastLevel.level + 1,
          small_blind: roundedSmallBlind,
          big_blind: roundedSmallBlind * 2,
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
        'Bônus inválido: ' +
        (!validName ? 'Nome deve ter pelo menos 3 caracteres alfanuméricos. ' : '') +
        (!validCondition ? 'Condição deve ter pelo menos 5 caracteres. ' : '') +
        (!validStack ? 'Stack deve ser um número positivo.' : '')
      );
      return;
    }

    setFormData(prev => ({
      ...prev,
      bonuses: [...prev.bonuses, {
        name: newBonus.name.trim(),
        stack: parseInt(newBonus.stack),
        condition: newBonus.condition.trim()
      }]
    }));
    setNewBonus({ name: '', stack: 0, condition: '' });
    setError(null);
  };

  const handleBonusRemove = (index) => {
    setFormData({
      ...formData,
      bonuses: formData.bonuses.filter((_, i) => i !== index)
    });
  };

  const handleRebuyToggle = (checked) => {
    setFormData({
      ...formData,
      rebuy: {
        ...formData.rebuy,
        allowed: checked,
        max_stack_for_single: checked ? formData.starting_stack : 0
      }
    });
  };

  const handleAddonToggle = (checked) => {
    setFormData({
      ...formData,
      addon: {
        ...formData.addon,
        allowed: checked
      }
    });
  };

  const totalPages = Math.ceil(formData.blind_structure.length / levelsPerPage);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Calculate the levels to show for the current page
  const startIndex = (currentPage - 1) * levelsPerPage;
  const endIndex = startIndex + levelsPerPage;
  const currentLevels = formData.blind_structure.slice(startIndex, endIndex);

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
                  {currentLevels.map((level, index) => (
                    <tr key={startIndex + index}>
                      <td className="px-4 py-2">{level.level}</td>
                      <td className="px-4 py-2">
                        {formData.blind_mode === 'custom' ? (
                          <input
                            type="number"
                            min="1"
                            value={level.small_blind}
                            onChange={(e) => handleNumberChange(e.target.value, 'small_blind', startIndex + index)}
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
                            onChange={(e) => handleNumberChange(e.target.value, 'big_blind', startIndex + index)}
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
                            onChange={(e) => handleNumberChange(e.target.value, 'duration', startIndex + index)}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          level.duration
                        )}
                      </td>
                      {formData.blind_mode === 'custom' && (
                        <td className="px-4 py-2">
                          {(startIndex + index) > 0 && (
                            <button
                              type="button"
                              onClick={() => removeBlindLevel(startIndex + index)}
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded ${
                        currentPage === page
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-8">
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Opções de Bônus</h3>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Nome do Bônus"
                  value={newBonus.name}
                  onChange={(e) => setNewBonus({ ...newBonus, name: e.target.value })}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Quantidade de Fichas"
                  value={newBonus.stack || ''}
                  onChange={(e) => setNewBonus({ ...newBonus, stack: parseInt(e.target.value) || 0 })}
                  className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="1"
                />
                <input
                  type="text"
                  placeholder="Condição"
                  value={newBonus.condition}
                  onChange={(e) => setNewBonus({ ...newBonus, condition: e.target.value })}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleBonusAdd}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Adicionar Bônus
                </button>
              </div>
            </div>
            
            {formData.bonuses.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Bônus Adicionados:</h4>
                <div className="space-y-2">
                  {formData.bonuses.map((bonus, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-medium">{bonus.name}</span>
                        <span className="mx-2">-</span>
                        <span>{bonus.stack.toLocaleString()} fichas</span>
                        <span className="mx-2">-</span>
                        <span className="text-gray-600">{bonus.condition}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBonusRemove(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Configuração do Intervalo e Rebuys</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nível do Intervalo</label>
                <input
                  type="number"
                  value={formData.break_level}
                  onChange={(e) => setFormData({
                    ...formData,
                    break_level: parseInt(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  min="1"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Neste nível:
                  <br />- O torneio terá um intervalo
                  <br />- Será o último nível para fazer rebuys
                  <br />- Jogadores poderão fazer add-on
                  <br />- Staff fechará a conta de rebuys de cada jogador
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rebuy.allowed}
                  onChange={(e) => handleRebuyToggle(e.target.checked)}
                  className="mr-2"
                />
                <span>Permitir Rebuys (até o nível do intervalo)</span>
              </div>
              
              {formData.rebuy.allowed && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stack Máximo para Rebuy Simples</label>
                    <input
                      type="number"
                      value={formData.rebuy.max_stack_for_single}
                      onChange={(e) => setFormData({
                        ...formData,
                        rebuy: {
                          ...formData.rebuy,
                          max_stack_for_single: parseInt(e.target.value)
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      min="1"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Jogadores só podem fazer rebuy simples se tiverem menos que este valor
                    </p>
                  </div>

                  <div>
                    <h4 className="text-md font-medium mb-2">Rebuy Simples</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantidade de Fichas</label>
                        <input
                          type="number"
                          value={formData.rebuy.single.stack}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              single: { ...formData.rebuy.single, stack: parseInt(e.target.value) }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Preço</label>
                        <input
                          type="number"
                          value={formData.rebuy.single.price}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              single: { ...formData.rebuy.single, price: parseInt(e.target.value) }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium mb-2">Rebuy Duplo</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantidade de Fichas</label>
                        <input
                          type="number"
                          value={formData.rebuy.double.stack}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              double: { ...formData.rebuy.double, stack: parseInt(e.target.value) }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Preço</label>
                        <input
                          type="number"
                          value={formData.rebuy.double.price}
                          onChange={(e) => setFormData({
                            ...formData,
                            rebuy: {
                              ...formData.rebuy,
                              double: { ...formData.rebuy.double, price: parseInt(e.target.value) }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Add-on (disponível durante o intervalo)</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.addon.allowed}
                  onChange={(e) => handleAddonToggle(e.target.checked)}
                  className="mr-2"
                />
                <span>Permitir Add-on durante o intervalo</span>
              </div>
              
              {formData.addon.allowed && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantidade de Fichas</label>
                    <input
                      type="number"
                      value={formData.addon.stack}
                      onChange={(e) => setFormData({
                        ...formData,
                        addon: {
                          ...formData.addon,
                          stack: parseInt(e.target.value)
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Preço</label>
                    <input
                      type="number"
                      value={formData.addon.price}
                      onChange={(e) => setFormData({
                        ...formData,
                        addon: {
                          ...formData.addon,
                          price: parseInt(e.target.value)
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      min="1"
                    />
                  </div>
                </div>
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