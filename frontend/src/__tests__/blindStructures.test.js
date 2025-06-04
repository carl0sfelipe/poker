import { validateBlindStructure } from '../utils/blindStructures.js';

describe('validateBlindStructure', () => {
  test('accepts a valid structure', () => {
    const structure = [
      { level: 1, small_blind: 25, big_blind: 50, duration: 10 },
      { level: 2, small_blind: 50, big_blind: 100, duration: 10 }
    ];
    const result = validateBlindStructure(structure, 2000);
    expect(result.valid).toBe(true);
  });

  test('rejects structure with invalid blinds', () => {
    const structure = [
      { level: 1, small_blind: 50, big_blind: 25, duration: 10 }
    ];
    const result = validateBlindStructure(structure, 1000);
    expect(result.valid).toBe(false);
  });
});
