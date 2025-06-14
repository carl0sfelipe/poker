const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');

const tournamentController = {
  async create(req, res) {
    try {
      console.log('Received tournament creation request:', JSON.stringify(req.body, null, 2));
      
      const { 
        name, 
        start_time, 
        starting_stack,
        blind_structure,
        bonuses = [], 
        addon = {
          allowed: false,
          stack: 0,
          price: 0
        },
        rebuy = {
          allowed: false,
          single: {
            stack: 0,
            price: 0
          },
          double: {
            stack: 0,
            price: 0
          }
        },
        buy_in,
        addonBonuses = [] // <-- novo campo
      } = req.body;

      // Validate required fields
      if (!name || !start_time || !starting_stack || !blind_structure) {
        console.error('Missing required fields:', { name, start_time, starting_stack, blind_structure });
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: {
            name: !name,
            start_time: !start_time,
            starting_stack: !starting_stack,
            blind_structure: !blind_structure
          }
        });
      }

      // Validate bonus structure if any bonuses are provided
      if (bonuses.length > 0) {
        const invalidBonuses = bonuses.filter(bonus => {
          // Check for required fields
          if (!bonus.name || !bonus.stack || !bonus.condition) {
            return true;
          }
          
          // Validate name format (at least 3 chars, alphanumeric with spaces)
          const validName = typeof bonus.name === 'string' && 
                          bonus.name.trim().length >= 3 &&
                          /^[a-zA-Z0-9\s]+$/.test(bonus.name.trim());
          
          // Validate condition (at least 5 chars)
          const validCondition = typeof bonus.condition === 'string' && 
                               bonus.condition.trim().length >= 5;
          
          // Validate stack (must be positive number)
          const validStack = typeof bonus.stack === 'number' && 
                           Number.isInteger(bonus.stack) && 
                           bonus.stack > 0;
          
          return !validName || !validCondition || !validStack;
        });

        if (invalidBonuses.length > 0) {
          console.error('Invalid bonus structure:', invalidBonuses);
          return res.status(400).json({ 
            error: 'Invalid bonus structure', 
            details: 'Each bonus must have a valid name (3+ alphanumeric chars), condition (5+ chars), and positive stack value',
            invalidBonuses 
          });
        }
      }

      // Validate addon if enabled
      if (addon.allowed) {
        if (!addon.stack || !addon.price) {
          console.error('Invalid addon configuration:', addon);
          return res.status(400).json({ 
            error: 'Invalid addon configuration',
            details: 'Add-on must have stack and price when allowed'
          });
        }
      }

      // Validate rebuy if enabled
      if (rebuy.allowed) {
        const rebuyErrors = [];
        if (!rebuy.single?.stack || !rebuy.single?.price) {
          rebuyErrors.push('Single rebuy must have stack and price when allowed');
        }
        if (!rebuy.double?.stack || !rebuy.double?.price) {
          rebuyErrors.push('Double rebuy must have stack and price when allowed');
        }
        if (rebuyErrors.length > 0) {
          console.error('Invalid rebuy configuration:', { rebuy, errors: rebuyErrors });
          return res.status(400).json({ 
            error: 'Invalid rebuy configuration',
            details: rebuyErrors
          });
        }
      }

      // Garante que addon_bonuses sempre seja um array, mesmo se vier objeto do front
      let formattedAddonBonuses = [];
      if (addon && addon.bonus) {
        if (Array.isArray(addon.bonus)) {
          formattedAddonBonuses = addon.bonus.map(bonus => ({
            name: String(bonus.name || '').trim().replace(/[^a-zA-Z0-9\s]/g, ''),
            stack: Number(bonus.stack),
            price: Number(bonus.price || 0)
          }));
        } else if (typeof addon.bonus === 'object') {
          const bonus = addon.bonus;
          formattedAddonBonuses = [{
            name: String(bonus.name || '').trim().replace(/[^a-zA-Z0-9\s]/g, ''),
            stack: Number(bonus.stack),
            price: Number(bonus.price || 0)
          }];
        }
      }

      // Format bonus data - ensure it's a proper JSONB array
      const formattedBonuses = bonuses.map(bonus => ({
        name: String(bonus.name || '').trim().replace(/[^a-zA-Z0-9\s]/g, ''),
        stack: Number(bonus.stack),
        price: Number(bonus.price || 0),
        condition: String(bonus.condition || '').trim()
      }));

      // Format addon data with explicit type conversion
      const formattedAddon = {
        allowed: Boolean(addon.allowed),
        stack: parseInt(addon.stack || 0),
        price: parseInt(addon.price || 0)
      };

      // Format rebuy data with explicit type conversion
      const formattedRebuy = {
        allowed: Boolean(rebuy.allowed),
        single: {
          stack: parseInt(rebuy.single?.stack || 0),
          price: parseInt(rebuy.single?.price || 0)
        },
        double: {
          stack: parseInt(rebuy.double?.stack || 0),
          price: parseInt(rebuy.double?.price || 0)
        }
      };

      // Normalize blind structure
      const normalizedBlindStructure = blind_structure.map(level => ({
        level: parseInt(level.level),
        smallBlind: parseInt(level.small_blind || level.smallBlind),
        bigBlind: parseInt(level.big_blind || level.bigBlind),
        duration: parseInt(level.duration)
      }));

      // Create the tournament data object
      const tournamentData = {
        id: uuidv4(),
        name: String(name).trim(),
        start_time,
        starting_stack: Number(starting_stack),
        blind_structure: normalizedBlindStructure,
        status: 'pending',
        bonuses: formattedBonuses, // Send as array of objects
        addon: formattedAddon,
        rebuy: formattedRebuy,
        buy_in: parseInt(buy_in || 0),
        addon_bonuses: formattedAddonBonuses
      };

      // Log only the bonuses field for debugging
      console.log('Bonuses to be sent:', JSON.stringify(tournamentData.bonuses));

      // LOG ÚNICO PARA DEBUG: GITHUB COPILOT DEBUG - DADOS ENVIADOS PARA O SUPABASE
      console.log('GITHUB COPILOT DEBUG - DADOS ENVIADOS PARA O SUPABASE:', JSON.stringify(tournamentData, null, 2));

      try {
        const { data, error } = await supabase
          .from('tournaments')
          .insert([tournamentData])
          .select()
          .single();

        if (error) {
          // Log only the error and bonuses field
          console.error('Supabase error:', error.message, 'Bonuses:', JSON.stringify(tournamentData.bonuses));
          return res.status(500).json({
            error: 'Database error',
            message: error.message,
            code: error.code
          });
        }
        res.status(201).json(data);
      } catch (error) {
        // Log only the error and bonuses field
        console.error('Create tournament error:', error.message, 'Bonuses:', JSON.stringify(tournamentData.bonuses));
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        details: error.details || error.hint || 'No additional details',
        type: error.constructor.name
      });
    }
  },

  async list(req, res) {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('List tournaments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          registrations (
            *,
            user:users (
              id,
              name,
              email
            )
          )
        `)
        .eq('id', id)
        .single();

      // Process the data to include user_name in registrations
      if (data && data.registrations) {
        data.registrations = data.registrations.map(reg => ({
          ...reg,
          user_name: reg.user.name || reg.user.email.split('@')[0], // Fallback to email username if name is not set
          user_email: reg.user.email
        }));
      }

      // Trata especificamente o erro PGRST116 (nenhuma linha encontrada)
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Tournament not found' });
        }
        throw error;
      }

      if (!data) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json(data);
    } catch (error) {
      console.error('Get tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async register(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const userId = req.user.id;
      const { selectedBonuses = [] } = req.body;

      // Do not allow new registrations if a champion already exists
      const { data: champion } = await supabase
        .from('registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('finish_place', 1)
        .single();

      if (champion) {
        return res.status(400).json({ error: 'Tournament already has a champion' });
      }

      // Check if already registered
      const { data: existingRegistration } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (existingRegistration) {
        return res.status(400).json({ error: 'Already registered for this tournament' });
      }

      // Get tournament details to validate bonuses
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      // Validate selected bonuses
      if (selectedBonuses.length > 0) {
        const validBonusIds = tournament.bonuses.map(b => b.name);
        const invalidBonuses = selectedBonuses.filter(b => !validBonusIds.includes(b));
        if (invalidBonuses.length > 0) {
          return res.status(400).json({ 
            error: `Invalid bonus selections: ${invalidBonuses.join(', ')}` 
          });
        }
      }

      // Calculate initial stack with bonuses
      let totalStack = tournament.starting_stack;
      selectedBonuses.forEach(bonusName => {
        const bonus = tournament.bonuses.find(b => b.name === bonusName);
        if (bonus) {
          totalStack += bonus.stack;
        }
      });

      const registrationData = {
        id: uuidv4(),
        user_id: userId,
        tournament_id: tournamentId,
        checked_in: false,
        current_stack: totalStack,
        selected_bonuses: selectedBonuses,
        rebuys: [],
        addon_used: false
      };
      console.log('Registration to be inserted:', JSON.stringify(registrationData, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .insert([
          registrationData
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error('Register for tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async manualRegister(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const { name, email, selectedBonuses = [] } = req.body;

      // Do not allow new registrations if a champion already exists
      const { data: champion } = await supabase
        .from('registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('finish_place', 1)
        .single();

      if (champion) {
        return res.status(400).json({ error: 'Tournament already has a champion' });
      }

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Find or create the user
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;

      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(
          process.env.DEFAULT_PASSWORD || 'poker123',
          salt
        );

        const insertResult = await supabase
          .from('users')
          .insert([
            {
              id: uuidv4(),
              name,
              email,
              password_hash: passwordHash,
              role: 'player'
            }
          ])
          .select('*')
          .single();

        userError = insertResult.error;
        user = insertResult.data;
        if (userError) throw userError;
      }

      // Check if already registered
      const { data: existingRegistration } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single();

      if (existingRegistration) {
        return res
          .status(400)
          .json({ error: 'User already registered for this tournament' });
      }

      // Get tournament to validate bonuses and starting stack
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      if (selectedBonuses.length > 0) {
        const validBonusIds = tournament.bonuses.map(b => b.name);
        const invalidBonuses = selectedBonuses.filter(
          b => !validBonusIds.includes(b)
        );
        if (invalidBonuses.length > 0) {
          return res.status(400).json({
            error: `Invalid bonus selections: ${invalidBonuses.join(', ')}`
          });
        }
      }

      let totalStack = tournament.starting_stack;
      selectedBonuses.forEach(bonusName => {
        const bonus = tournament.bonuses.find(b => b.name === bonusName);
        if (bonus) {
          totalStack += bonus.stack;
        }
      });

      const registrationData = {
        id: uuidv4(),
        user_id: user.id,
        tournament_id: tournamentId,
        checked_in: false,
        current_stack: totalStack,
        selected_bonuses: selectedBonuses,
        rebuys: [],
        addon_used: false
      };
      console.log('Manual registration to be inserted:', JSON.stringify(registrationData, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .insert([
          registrationData
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error('Manual register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async addRebuy(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const { userId, isDouble = false } = req.body;

      // Get tournament and registration details
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament.rebuy.allowed) {
        return res.status(400).json({ error: 'Rebuys are not allowed in this tournament' });
      }

      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (regError) throw regError;

      // Check if rebuys are already settled/paid
      if (registration.rebuys_paid) {
        return res.status(400).json({ error: 'Cannot add rebuy: payment has already been settled' });
      }

      // Add rebuy stack
      const rebuyStack = isDouble ? 
        tournament.rebuy.double.stack : 
        tournament.rebuy.single.stack;

      const newStack = registration.current_stack + rebuyStack;
      const newRebuy = {
        timestamp: new Date().toISOString(),
        type: isDouble ? 'double' : 'single',
        stack: rebuyStack
      };

      const updateData = {
        current_stack: newStack,
        rebuys: [...(registration.rebuys || []), newRebuy],
        single_rebuys: isDouble ? (registration.single_rebuys || 0) : (registration.single_rebuys || 0) + 1,
        double_rebuys: isDouble ? (registration.double_rebuys || 0) + 1 : (registration.double_rebuys || 0),
        last_rebuy_level: tournament.current_level || 1
      };
      console.log('Rebuy update to be sent:', JSON.stringify(updateData, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Add rebuy error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async addAddon(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const { userId } = req.body;

      // Get tournament and registration details
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament.addon.allowed) {
        return res.status(400).json({ error: 'Add-ons are not allowed in this tournament' });
      }

      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (regError) throw regError;

      if (registration.addon_used) {
        return res.status(400).json({ error: 'Add-on already used' });
      }

      const newStack = registration.current_stack + tournament.addon.stack;

      const updateData = {
        current_stack: newStack,
        addon_used: true
      };
      console.log('Addon update to be sent:', JSON.stringify(updateData, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Add addon error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async checkIn(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const { userId } = req.body;

      const updateData = { checked_in: true };
      console.log('Check-in update to be sent:', JSON.stringify(updateData, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      res.json(data);
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async eliminate(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const { userId } = req.body;

      console.log('Eliminating player:', { tournamentId, userId });

      // Get total number of players and number of eliminated players
      const { data: registrations } = await supabase
        .from('registrations')
        .select('eliminated, checked_in')
        .eq('tournament_id', tournamentId);

      const totalPlayers = registrations.filter(r => r.checked_in).length;
      const eliminatedPlayers = registrations.filter(r => r.eliminated).length;
      
      // Determine elimination order but do not set final position yet
      const eliminationOrder = eliminatedPlayers + 1;

      const updateData = {
        eliminated: true,
        elimination_order: eliminationOrder,
        finish_place: null
      };
      console.log('Elimination update to be sent:', JSON.stringify(updateData, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Elimination error:', error);
        throw error;
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      // If this elimination leaves only one player remaining,
      // automatically crown the champion and finalize positions
      if (totalPlayers - eliminationOrder === 1) {
        const { data: lastPlayer } = await supabase
          .from('registrations')
          .select('user_id')
          .eq('tournament_id', tournamentId)
          .eq('eliminated', false)
          .single();

        if (lastPlayer) {
          // Set champion elimination order as the total number of players
          await supabase
            .from('registrations')
            .update({
              eliminated: true,
              elimination_order: totalPlayers,
              finish_place: 1  // Champion
            })
            .eq('tournament_id', tournamentId)
            .eq('user_id', lastPlayer.user_id);

          // Finalize finish positions for all players based on elimination order
          const { data: allRegs } = await supabase
            .from('registrations')
            .select('id, elimination_order')
            .eq('tournament_id', tournamentId);

          for (const reg of allRegs) {
            const finalPlace = totalPlayers - reg.elimination_order + 1;
            await supabase
              .from('registrations')
              .update({ finish_place: finalPlace })
              .eq('id', reg.id);
          }
        }
      }

      console.log('Player eliminated successfully:', data);
      res.json(data);
    } catch (error) {
      console.error('Eliminate player error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async exportResults(req, res) {
    try {
      const { id: tournamentId } = req.params;

      const result = await supabase
        .from('registrations')
        .select(`
          finish_place,
          user:users (
            email
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('finish_place', { ascending: true });

      if (!result.data || result.error) throw result.error;

      // Convert to CSV
      const headers = ['Place', 'Email', 'Checked In', 'Seat', 'Table'];
      const rows = result.data.map(r => [
        r.finish_place || 'N/A',
        r.user.email,
        r.checked_in ? 'Yes' : 'No',
        r.seat_number || 'N/A',
        r.table_number || 'N/A'
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.attachment('tournament-results.csv');
      res.send(csv);
    } catch (error) {
      console.error('Export results error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async settlePayment(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const { 
        userId, 
        confirmPayment, 
        includeAddon, 
        includeBuyIn, 
        selectedBonuses = [],
        selectedBonusAddons = [] 
      } = req.body;

      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (regError) throw regError;
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      if (!confirmPayment) {
        const { data, error } = await supabase
          .from('registrations')
          .update({ payment_status: 'eliminated', eliminated: true })
          .eq('id', registration.id)
          .select()
          .single();

        if (error) throw error;
        return res.json(data);
      }

      const updates = {
        rebuys_paid: true,
        payment_status: 'paid',
        payment_timestamp: new Date().toISOString()
      };

      // Processar pagamento do buy-in
      if (includeBuyIn) {
        updates.buy_in_paid = true;
      }

      // Obter dados do torneio para informações sobre os bônus e seus addons
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('bonuses, addon')
        .eq('id', tournamentId)
        .single();

      // Processar pagamento dos bônus
      if (selectedBonuses && selectedBonuses.length > 0) {
        // Manter os bônus que o jogador já tinha e adicionar os novos
        const currentBonuses = registration.selected_bonuses || [];
        const allBonuses = [...new Set([...currentBonuses, ...selectedBonuses])];
        
        // Atualizar quais bônus estão marcados como pagos
        const paidBonuses = registration.bonuses_paid || [];
        updates.selected_bonuses = allBonuses;
        updates.bonuses_paid = [...new Set([...paidBonuses, ...selectedBonuses])];
        
        // Recalcular o stack adicionando os novos bônus selecionados
        // Adicionar stack apenas para novos bônus selecionados
        const newBonuses = selectedBonuses.filter(bonus => !currentBonuses.includes(bonus));
        let additionalStack = 0;
        
        if (tournament && tournament.bonuses) {
          newBonuses.forEach(bonusName => {
            const bonus = tournament.bonuses.find(b => b.name === bonusName);
            if (bonus) {
              additionalStack += bonus.stack;
            }
          });
        }
        
        if (additionalStack > 0) {
          updates.current_stack = (registration.current_stack || 0) + additionalStack;
        }
      }

      // Processar os addons de bônus
      if (selectedBonusAddons && selectedBonusAddons.length > 0) {
        const currentBonusAddons = registration.bonus_addons_used || [];
        const newBonusAddons = selectedBonusAddons.filter(addon => !currentBonusAddons.includes(addon));
        
        // Verificar se existem novos addons de bônus e adicionar suas fichas ao stack
        if (newBonusAddons.length > 0 && tournament?.bonuses) {
          let addonAdditionalStack = 0;
          
          newBonusAddons.forEach(bonusName => {
            const bonus = tournament.bonuses.find(b => b.name === bonusName);
            if (bonus && bonus.addon) {
              addonAdditionalStack += bonus.addon.stack;
            }
          });
          
          // Atualizar o stack atual com as fichas adicionais dos addons de bônus
          if (addonAdditionalStack > 0) {
            updates.current_stack = (updates.current_stack || registration.current_stack || 0) + addonAdditionalStack;
          }
          
          // Atualizar a lista de addons de bônus usados
          updates.bonus_addons_used = [...new Set([...currentBonusAddons, ...newBonusAddons])];
        }
      }

      // Processar pagamento e uso do addon padrão do torneio
      if (registration.addon_used && !registration.addon_paid) {
        updates.addon_paid = true;
      }

      if (includeAddon && !registration.addon_used && tournament?.addon?.allowed) {
        updates.current_stack = (updates.current_stack || registration.current_stack || 0) + tournament.addon.stack;
        updates.addon_used = true;
        updates.addon_paid = true;
      }

      console.log('Settle payment update to be sent:', JSON.stringify(updates, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .update(updates)
        .eq('id', registration.id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Settle payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const { forceDelete, password } = req.body;

      // Primeiro, verifica se o torneio existe
      const { data: tournament, error: findError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      // Trata especificamente o erro PGRST116 (nenhuma linha encontrada)
      if (findError) {
        if (findError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Tournament not found' });
        }
        throw findError;
      }

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Verifica se o torneio pode ser deletado normalmente (status deve ser 'pending')
      let needsForceDelete = tournament.status !== 'pending';

      // Verifica se há jogadores registrados
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('id')
        .eq('tournament_id', id);

      if (regError) throw regError;
      
      // Se tem jogadores registrados, precisa de force delete
      if (registrations && registrations.length > 0) {
        needsForceDelete = true;
      }

      // Se precisa de force delete e não foi fornecido, retorna erro
      if (needsForceDelete && !forceDelete) {
        return res.status(409).json({ 
          error: 'Cannot delete tournament that has already started or has registered players',
          requiresForceDelete: true
        });
      }

      // Se foi solicitado force delete, verifica a senha
      if (forceDelete) {
        // Busca o hash da senha do usuário
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('password_hash')
          .eq('id', req.user.id)
          .single();

        if (userError) throw userError;
        
        // Verifica se a senha está correta
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Deleta o torneio
      const { error: deleteError } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Retorna sucesso com status 204 (No Content)
      res.status(204).send();
    } catch (error) {
      console.error('Delete tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateRebuyCount(req, res) {
    try {
      const { id: tournamentId } = req.params;
      const { userId, singleRebuys, doubleRebuys } = req.body;

      // Validações básicas
      if (singleRebuys < 0 || doubleRebuys < 0) {
        return res.status(400).json({ error: 'Rebuy counts cannot be negative' });
      }

      // Verifica se a inscrição existe
      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (regError) {
        console.error('Registration query error:', regError);
        return res.status(404).json({ error: 'Registration not found' });
      }

      // Não permite editar se o pagamento já foi confirmado
      if (registration.rebuys_paid) {
        return res.status(400).json({ error: 'Cannot edit rebuy counts after payment has been settled' });
      }

      // Calcula a diferença no stack por causa da mudança na quantidade de rebuys
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) {
        console.error('Tournament query error:', tournamentError);
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Recalcula o stack com base nas novas contagens de rebuy
      const oldSingleStack = (registration.single_rebuys || 0) * tournament.rebuy.single.stack;
      const oldDoubleStack = (registration.double_rebuys || 0) * tournament.rebuy.double.stack;
      
      const newSingleStack = singleRebuys * tournament.rebuy.single.stack;
      const newDoubleStack = doubleRebuys * tournament.rebuy.double.stack;
      
      // Calcula o delta para ajustar o stack atual
      const stackDelta = (newSingleStack + newDoubleStack) - (oldSingleStack + oldDoubleStack);
      const newStack = registration.current_stack + stackDelta;

      // Atualiza o registro com as novas contagens de rebuy e o stack ajustado
      const updateData = {
        single_rebuys: singleRebuys,
        double_rebuys: doubleRebuys,
        current_stack: newStack
      };
      console.log('Update rebuy count to be sent:', JSON.stringify(updateData, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update rebuy count error:', error);
        return res.status(500).json({ error: 'Failed to update rebuy counts' });
      }

      res.json(data);
    } catch (error) {
      console.error('Update rebuy count error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = tournamentController;