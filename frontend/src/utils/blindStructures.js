// Estruturas de blind predefinidas para diferentes tamanhos de stack inicial
const BLIND_STRUCTURES = {
  // Para stacks de 10,000 a 15,000
  small: {
    name: 'Turbo (15 min)',
    levels: generateBlindLevels(15)
  },
  
  // Para stacks de 15,000 a 25,000
  medium: {
    name: 'Regular (20 min)',
    levels: generateBlindLevels(20)
  },
  
  // Para stacks de 25,000 ou mais
  large: {
    name: 'Deep Stack (30 min)',
    levels: generateBlindLevels(30)
  }
};

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

// Função para gerar níveis de blind com progressão específica
function generateBlindLevels(duration) {
  const levels = [];
  let level = 1;
  
  // Primeiros 6 níveis com a progressão exata especificada
  const initialLevels = [
    { small_blind: 100, big_blind: 100 },
    { small_blind: 100, big_blind: 200 },
    { small_blind: 100, big_blind: 300 },
    { small_blind: 200, big_blind: 400 },
    { small_blind: 300, big_blind: 600 },
    { small_blind: 400, big_blind: 800 }
  ];

  // Adiciona os primeiros 6 níveis
  initialLevels.forEach(blinds => {
    levels.push({
      level: level++,
      small_blind: blinds.small_blind,
      big_blind: blinds.big_blind,
      duration: duration
    });
  });

  // Continua a progressão para os níveis restantes
  let smallBlind = 400; // Começa do último small blind usado
  let bigBlind = 800;   // Começa do último big blind usado

  // Gera os níveis restantes até 50
  while (level <= 50) {
    smallBlind = Math.round(smallBlind * 1.25); // Aumenta 25% a cada nível
    smallBlind = roundToNiceNumber(smallBlind); // Arredonda para um número redondo
    bigBlind = smallBlind * 2;

    levels.push({
      level: level++,
      small_blind: smallBlind,
      big_blind: bigBlind,
      duration: duration
    });
  }

  return levels;
}

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
    if (level.small_blind > level.big_blind) {
      return { valid: false, error: `Nível ${i + 1}: Small blind deve ser menor ou igual ao big blind` };
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

export {
  BLIND_STRUCTURES,
  getRecommendedStructure,
  validateBlindStructure
};