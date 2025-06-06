-- Adicionando novas colunas na tabela tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS bonuses JSONB[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS addon JSONB DEFAULT '{
  "allowed": false,
  "stack": 0,
  "price": 0
}',
ADD COLUMN IF NOT EXISTS rebuy JSONB DEFAULT '{
  "allowed": false,
  "single": {
    "stack": 0,
    "price": 0
  },
  "double": {
    "stack": 0,
    "price": 0
  }
}',
ADD COLUMN IF NOT EXISTS addon_bonuses JSONB DEFAULT '[]';

-- Adicionando novas colunas na tabela registrations
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS current_stack INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS selected_bonuses TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rebuys JSONB[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS addon_used BOOLEAN DEFAULT false;

-- Criando índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tournament_bonuses ON tournaments USING GIN (bonuses);
CREATE INDEX IF NOT EXISTS idx_registration_selected_bonuses ON registrations USING GIN (selected_bonuses);
CREATE INDEX IF NOT EXISTS idx_registration_rebuys ON registrations USING GIN (rebuys);

-- Adicionando constraints
ALTER TABLE registrations
ADD CONSTRAINT check_current_stack_positive CHECK (current_stack >= 0);

-- Função para validar a estrutura do JSON de bônus
CREATE OR REPLACE FUNCTION validate_bonus_structure()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se cada bônus tem os campos necessários
  IF NEW.bonuses IS NOT NULL THEN
    FOR i IN 0..array_length(NEW.bonuses, 1)-1 LOOP
      IF NOT (
        NEW.bonuses[i]->>'name' IS NOT NULL AND
        NEW.bonuses[i]->>'name' != '' AND
        NEW.bonuses[i]->>'stack' IS NOT NULL AND
        (NEW.bonuses[i]->>'stack')::integer > 0 AND
        NEW.bonuses[i]->>'condition' IS NOT NULL AND
        NEW.bonuses[i]->>'condition' != ''
      ) THEN
        RAISE EXCEPTION 'Invalid bonus structure. Each bonus must have a non-empty name, a positive stack value, and a non-empty condition.';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar bônus antes de inserir/atualizar
DROP TRIGGER IF EXISTS validate_bonus_before_save ON tournaments;
CREATE TRIGGER validate_bonus_before_save
  BEFORE INSERT OR UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION validate_bonus_structure();

-- Função para validar a estrutura do JSON de rebuy
CREATE OR REPLACE FUNCTION validate_rebuy_structure()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.rebuy->>'allowed')::boolean THEN
    IF NOT (
      NEW.rebuy->'single'->>'stack' IS NOT NULL AND
      (NEW.rebuy->'single'->>'stack')::integer > 0 AND
      NEW.rebuy->'single'->>'price' IS NOT NULL AND
      (NEW.rebuy->'single'->>'price')::integer > 0 AND
      NEW.rebuy->'double'->>'stack' IS NOT NULL AND
      (NEW.rebuy->'double'->>'stack')::integer > 0 AND
      NEW.rebuy->'double'->>'price' IS NOT NULL AND
      (NEW.rebuy->'double'->>'price')::integer > 0
    ) THEN
      RAISE EXCEPTION 'Invalid rebuy structure. When allowed, both single and double must have positive stack and price values.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar rebuy antes de inserir/atualizar
DROP TRIGGER IF EXISTS validate_rebuy_before_save ON tournaments;
CREATE TRIGGER validate_rebuy_before_save
  BEFORE INSERT OR UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION validate_rebuy_structure();

-- Função para validar a estrutura do JSON de addon
CREATE OR REPLACE FUNCTION validate_addon_structure()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.addon->>'allowed')::boolean THEN
    IF NOT (
      NEW.addon->>'stack' IS NOT NULL AND
      (NEW.addon->>'stack')::integer > 0 AND
      NEW.addon->>'price' IS NOT NULL AND
      (NEW.addon->>'price')::integer > 0
    ) THEN
      RAISE EXCEPTION 'Invalid addon structure. When allowed, must have positive stack and price values.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar addon antes de inserir/atualizar
DROP TRIGGER IF EXISTS validate_addon_before_save ON tournaments;
CREATE TRIGGER validate_addon_before_save
  BEFORE INSERT OR UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION validate_addon_structure();