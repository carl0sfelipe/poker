# Poker Platform – Database Schema (public)

> **Versão gerada automaticamente – *06 Jun 2025***
>
> Este documento agora reflete o novo fluxo de trabalho para alterações no banco de dados e no sistema.

---

## Fluxo de trabalho para alterações

### Modo "ask"
1. Quando uma alteração for solicitada, será fornecido:
   - Um script SQL para rodar no Supabase.
   - Um resumo explicando o impacto da alteração.
2. O script SQL deve ser executado no Supabase antes de aprovar a alteração.

### Modo "agent"
1. Após a aprovação, considera-se que o script SQL já foi executado no Supabase.
2. As alterações no código serão feitas com base no novo estado do banco de dados.
3. O `AGENTS.md` será atualizado para refletir as novas informações.

---

## Diagrama geral

```
users ──┐             ┌──< registrations >── tournaments
        └── user_id ─┘            │            └─ tournament_id
                                   └─ FK refs ──┘
```

---

## Tabelas

### 1. `users`

| Coluna          | Tipo          | PK | Nullable | Default/Extra       | Descrição                      |
| --------------- | ------------- | -- | -------- | ------------------- | ------------------------------ |
| `id`            | `uuid`        | ✔  | NO       | `gen_random_uuid()` | Identificador único do usuário |
| `email`         | `text`        |    | NO       |                     | E‑mail de login (único)        |
| `password_hash` | `text`        |    | NO       |                     | Hash BCrypt / Argon2           |
| `role`          | `text`        |    | NO       | `'player'`          | Papel (player, staff, admin)   |
| `created_at`    | `timestamptz` |    | NO       | `now()`             | Timestamp de criação           |
| `name`          | `varchar`     |    | SIM      |                     | Nome de exibição               |

**Primary Key:** (`id`)

---

### 2. `tournaments`

| Coluna                       | Tipo          | PK | Nullable | Default/Extra       | Descrição                                  |
| ---------------------------- | ------------- | -- | -------- | ------------------- | ------------------------------------------ |
| `id`                         | `uuid`        | ✔  | NO       | `gen_random_uuid()` | Identificador do torneio                   |
| `name`                       | `text`        |    | NO       |                     | Nome do torneio                            |
| `start_time`                 | `timestamptz` |    | NO       |                     | Data/hora de início                        |
| `starting_stack`             | `int4`        |    | NO       |                     | Stack inicial em fichas                    |
| `blind_structure`            | `jsonb`       |    | NO       |                     | Estrutura completa de blinds               |
| `status`                     | `text`        |    | NO       | `'scheduled'`       | Estado (scheduled, running, paused, done…) |
| `created_at`                 | `timestamptz` |    | NO       | `now()`             | Timestamp de criação                       |
| `bonuses`                    | `jsonb`       |    | SIM      |                     | Config. de bônus (tickets, promoções)      |
| `addon`                      | `jsonb`       |    | SIM      |                     | Configuração de addon                      |
| `rebuy`                      | `jsonb`       |    | SIM      |                     | Regras de rebuy                            |
| `rebuy_max_level`            | `int4`        |    | SIM      |                     | Nível (round) máximo para rebuy            |
| `max_stack_for_single_rebuy` | `int4`        |    | SIM      |                     | Stack máximo permitido num rebuy simples   |
| `addon_break_level`          | `int4`        |    | SIM      |                     | Nível em que o addon é permitido           |
| `current_level`              | `int4`        |    | SIM      |                     | Nível atual (runtime)                      |
| `current_blind_index`        | `int4`        |    | SIM      |                     | Posição na lista de blinds                 |
| `is_break`                   | `bool`        |    | SIM      | `false`             | Flag se o torneio está em intervalo        |

**Primary Key:** (`id`)

---

### 3. `registrations`

| Coluna              | Tipo             | PK | Nullable | Default/Extra         | Descrição                                |
| ------------------- | ---------------- | -- | -------- | --------------------- | ---------------------------------------- |
| `id`                | `uuid`           | ✔  | NO       | `gen_random_uuid()`   | Identificador da inscrição               |
| `user_id`           | `uuid`           |    | NO       | FK → `users.id`       | Jogador inscrito                         |
| `tournament_id`     | `uuid`           |    | NO       | FK → `tournaments.id` | Torneio correspondente                   |
| `checked_in`        | `bool`           |    | NO       | `false`               | Check‑in confirmado?                     |
| `seat_number`       | `int4`           |    | SIM      |                       | Nº do assento                            |
| `table_number`      | `int4`           |    | SIM      |                       | Mesa                                     |
| `finish_place`      | `int4`           |    | SIM      |                       | Colocação final                          |
| `created_at`        | `timestamptz`    |    | NO       | `now()`               | Timestamp de inscrição                   |
| `current_stack`     | `int4`           |    | SIM      |                       | Stack atual (runtime)                    |
| `selected_bonuses`  | `_text` (array)  |    | SIM      |                       | Bônus escolhidos                         |
| `rebuys`            | `_jsonb` (array) |    | SIM      |                       | Histórico de rebuys                      |
| `addon_used`        | `bool`           |    | NO       | `false`               | Usou addon?                              |
| `single_rebuys`     | `int4`           |    | NO       | `0`                   | Qtde de rebuy simples                    |
| `double_rebuys`     | `int4`           |    | NO       | `0`                   | Qtde de rebuy duplo                      |
| `eliminated`        | `bool`           |    | NO       | `false`               | Já foi eliminado?                        |
| `stack_at_rebuy`    | `int4`           |    | SIM      |                       | Stack quando fez rebuy                   |
| `elimination_level` | `int4`           |    | SIM      |                       | Level em que foi eliminado               |
| `last_rebuy_level`  | `int4`           |    | SIM      |                       | Level do último rebuy                    |
| `elimination_order` | `int4`           |    | SIM      |                       | Ordem cronológica de eliminação          |
| `rebuys_paid`       | `bool`           |    | NO       | `false`               | Pagou pelos rebuys?                      |
| `addon_paid`        | `bool`           |    | NO       | `false`               | Pagou pelo addon?                        |
| `payment_status`    | `text`           |    | NO       | `'pending'`           | pending / paid / refunded                |
| `payment_timestamp` | `timestamptz`    |    | SIM      |                       | Horário da última tentativa de pagamento |

**Primary Key:** (`id`)

**Foreign Keys:**

* `user_id` → `users(id)`
* `tournament_id` → `tournaments(id)`

---

## Índice de relacionamento

| Origem                        | FK               | Destino       | Cardinalidade |
| ----------------------------- | ---------------- | ------------- | ------------- |
| `registrations.user_id`       | `users.id`       | `users`       | N : 1         |
| `registrations.tournament_id` | `tournaments.id` | `tournaments` | N : 1         |

---

## Regras e observações de negócio

1. **Um usuário pode ter múltiplas inscrições** (`registrations`) em torneios diferentes, mas no MVP assumimos **uma inscrição por torneio**.
2. **Pagamentos**: os campos `payment_status` e `payment_timestamp` registram a quitação de rebuy/addon; pagamentos parciais são controlados pelos flags `rebuys_paid` e `addon_paid`.
3. **Runtime state** (blinds correntes, stacks etc.) é persistido diretamente nas tabelas para simplificar o MVP; versão futura deve mover para tabelas de histórico ou Redis.

---

## Scripts SQL para Supabase

### Atualizar Preço dos Bônus

Para adicionar ou atualizar o preço do bônus Staff em torneios existentes, use o script abaixo diretamente no console SQL do Supabase:

```sql
-- Script para adicionar preço (R$ 10) ao bônus Staff em todos os torneios existentes
UPDATE tournaments
SET bonuses = jsonb_set(
  bonuses,
  '{0}',
  bonuses->0 || '{"price": 10}'::jsonb
)
WHERE 
  bonuses->0->>'name' = 'Bonus Staff' 
  AND (bonuses->0->>'price' IS NULL OR (bonuses->0->>'price')::int = 0);

-- Adiciona preço 0 aos outros bônus caso não tenham
UPDATE tournaments
SET bonuses = jsonb_set(
  bonuses,
  '{1}',
  bonuses->1 || '{"price": 0}'::jsonb
)
WHERE 
  bonuses->1->>'name' = 'Bonus Horario'
  AND bonuses->1->>'price' IS NULL;

UPDATE tournaments
SET bonuses = jsonb_set(
  bonuses,
  '{2}',
  bonuses->2 || '{"price": 0}'::jsonb
)
WHERE 
  bonuses->2->>'name' = 'Bonus Pix Antecipado'
  AND bonuses->2->>'price' IS NULL;
```

**Observação:** Este projeto utiliza o Supabase diretamente, sem migrações tradicionais. Execute esses scripts diretamente no console SQL do Supabase quando necessário atualizar a estrutura ou dados existentes.

---

### Próximos passos sugeridos

| Sprint | Item                                                                         | Comentário                          |
| ------ | ---------------------------------------------------------------------------- | ----------------------------------- |
| 1      | Índices em `registrations (tournament_id, user_id)`                          | Optimizar consultas frequentes      |
| 2      | Tabela `tables` para controle de mesas físicas                               | Remove duplicidade (`table_number`) |
| 3      | Trigger de atualização automática de `current_level` / `current_blind_index` | Garantir consistência runtime       |

---

*Fim do documento*
