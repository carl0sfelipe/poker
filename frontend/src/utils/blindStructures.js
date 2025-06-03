// Estruturas de blind predefinidas para diferentes tamanhos de stack inicial
const BLIND_STRUCTURES = {
  // Para stacks de 10,000 a 15,000
  small: {
    name: 'Turbo (15 min)',
    levels: [
      { level: 1, small_blind: 25, big_blind: 50, duration: 15 },
      { level: 2, small_blind: 50, big_blind: 100, duration: 15 },
      { level: 3, small_blind: 75, big_blind: 150, duration: 15 },
      { level: 4, small_blind: 100, big_blind: 200, duration: 15 },
      { level: 5, small_blind: 150, big_blind: 300, duration: 15 },
      { level: 6, small_blind: 200, big_blind: 400, duration: 15 },
      { level: 7, small_blind: 300, big_blind: 600, duration: 15 },
      { level: 8, small_blind: 400, big_blind: 800, duration: 15 },
      { level: 9, small_blind: 600, big_blind: 1200, duration: 15 },
      { level: 10, small_blind: 800, big_blind: 1600, duration: 15 },
      { level: 11, small_blind: 1000, big_blind: 2000, duration: 15 },
      { level: 12, small_blind: 1500, big_blind: 3000, duration: 15 },
    ]
  },
  
  // Para stacks de 15,000 a 25,000
  medium: {
    name: 'Regular (20 min)',
    levels: [
      { level: 1, small_blind: 25, big_blind: 50, duration: 20 },
      { level: 2, small_blind: 50, big_blind: 100, duration: 20 },
      { level: 3, small_blind: 75, big_blind: 150, duration: 20 },
      { level: 4, small_blind: 100, big_blind: 200, duration: 20 },
      { level: 5, small_blind: 150, big_blind: 300, duration: 20 },
      { level: 6, small_blind: 200, big_blind: 400, duration: 20 },
      { level: 7, small_blind: 300, big_blind: 600, duration: 20 },
      { level: 8, small_blind: 400, big_blind: 800, duration: 20 },
      { level: 9, small_blind: 500, big_blind: 1000, duration: 20 },
      { level: 10, small_blind: 700, big_blind: 1400, duration: 20 },
      { level: 11, small_blind: 1000, big_blind: 2000, duration: 20 },
      { level: 12, small_blind: 1500, big_blind: 3000, duration: 20 },
      { level: 13, small_blind: 2000, big_blind: 4000, duration: 20 },
      { level: 14, small_blind: 3000, big_blind: 6000, duration: 20 },
    ]
  },
  
  // Para stacks de 25,000 ou mais
  large: {
    name: 'Deep Stack (30 min)',
    levels: [
      { level: 1, small_blind: 25, big_blind: 50, duration: 30 },
      { level: 2, small_blind: 50, big_blind: 100, duration: 30 },
      { level: 3, small_blind: 75, big_blind: 150, duration: 30 },
      { level: 4, small_blind: 100, big_blind: 200, duration: 30 },
      { level: 5, small_blind: 150, big_blind: 300, duration: 30 },
      { level: 6, small_blind: 200, big_blind: 400, duration: 30 },
      { level: 7, small_blind: 250, big_blind: 500, duration: 30 },
      { level: 8, small_blind: 300, big_blind: 600, duration: 30 },
      { level: 9, small_blind: 400, big_blind: 800, duration: 30 },
      { level: 10, small_blind: 500, big_blind: 1000, duration: 30 },
      { level: 11, small_blind: 700, big_blind: 1400, duration: 30 },
      { level: 12, small_blind: 1000, big_blind: 2000, duration: 30 },
      { level: 13, small_blind: 1500, big_blind: 3000, duration: 30 },
      { level: 14, small_blind: 2000, big_blind: 4000, duration: 30 },
      { level: 15, small_blind: 3000, big_blind: 6000, duration: 30 },
      { level: 16, small_blind: 4000, big_blind: 8000, duration: 30 },
    ]
  }
};

// Função para obter a estrutura de blind recomendada com base no stack inicial
const getRecommendedStructure = (startingStack) => {
  if (startingStack <= 15000) {
    return BLIND_STRUCTURES.small;
  } else if (startingStack <= 25000) {
    return BLIND_STRUCTURES.medium;
  } else {
    return BLIND_STRUCTURES.large;
  }
};

// Função para validar uma estrutura de blind personalizada
const validateBlindStructure = (structure, startingStack) => {
  if (!Array.isArray(structure) || structure.length === 0) {
    return { valid: false, error: 'A estrutura de blinds deve ter pelo menos um nível' };
  }

  for (let i = 0; i < structure.length; i++) {
    const level = structure[i];
    
    // Verificar campos obrigatórios
    if (!level.small_blind || !level.big_blind || !level.duration) {
      return { valid: false, error: `Nível ${i + 1} está incompleto` };
    }

    // Verificar valores positivos
    if (level.small_blind <= 0 || level.big_blind <= 0 || level.duration <= 0) {
      return { valid: false, error: `Nível ${i + 1} tem valores inválidos` };
    }

    // Verificar se small blind é menor que big blind
    if (level.small_blind >= level.big_blind) {
      return { valid: false, error: `Nível ${i + 1}: Small blind deve ser menor que big blind` };
    }

    // Verificar se o big blind inicial não é muito alto em relação ao stack inicial
    if (i === 0 && level.big_blind > startingStack / 40) {
      return { 
        valid: false, 
        error: 'O big blind inicial não deve ser maior que 2.5% do stack inicial' 
      };
    }
  }

  return { valid: true };
};

export { BLIND_STRUCTURES, getRecommendedStructure, validateBlindStructure }; 