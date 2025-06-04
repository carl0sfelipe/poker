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
        }
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

      // Format bonus data - ensure it's a proper JSONB array
      const formattedBonuses = bonuses.map(bonus => ({
        name: String(bonus.name || '').trim().replace(/[^a-zA-Z0-9\s]/g, ''),
        stack: Number(bonus.stack),
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
        rebuy: formattedRebuy
      };

      // Log only the bonuses field for debugging
      console.log('Bonuses to be sent:', JSON.stringify(tournamentData.bonuses));

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
      console.error('Create tournament error:', {
        error,
        message: error.message,
        stack: error.stack,
        details: error.details || 'No additional details'
      });
      
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

      const { data, error } = await supabase
        .from('registrations')
        .insert([
          {
            id: uuidv4(),
            user_id: userId,
            tournament_id: tournamentId,
            checked_in: false,
            current_stack: totalStack,
            selected_bonuses: selectedBonuses,
            rebuys: [],
            addon_used: false
          }
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

      const { data, error } = await supabase
        .from('registrations')
        .insert([
          {
            id: uuidv4(),
            user_id: user.id,
            tournament_id: tournamentId,
            checked_in: false,
            current_stack: totalStack,
            selected_bonuses: selectedBonuses,
            rebuys: [],
            addon_used: false
          }
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

      // Update registration with new stack, rebuy record, and increment counter
      const { data, error } = await supabase
        .from('registrations')
        .update({ 
          current_stack: newStack,
          rebuys: [...(registration.rebuys || []), newRebuy],
          single_rebuys: isDouble ? (registration.single_rebuys || 0) : (registration.single_rebuys || 0) + 1,
          double_rebuys: isDouble ? (registration.double_rebuys || 0) + 1 : (registration.double_rebuys || 0),
          last_rebuy_level: tournament.current_level || 1
        })
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

      const { data, error } = await supabase
        .from('registrations')
        .update({ 
          current_stack: newStack,
          addon_used: true
        })
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

      const { data, error } = await supabase
        .from('registrations')
        .update({ checked_in: true })
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
      
      // Calculate finish place (total players - eliminated players)
      // This way, last player eliminated gets 2nd place, second to last gets 3rd, etc.
      // The last remaining player will be the champion (1st place)
      const finishPlace = totalPlayers - eliminatedPlayers;

      const { data, error } = await supabase
        .from('registrations')
        .update({ 
          eliminated: true,
          finish_place: finishPlace
        })
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

      // If this was the second to last player (meaning only one remains),
      // automatically set the remaining player as the champion
      if (finishPlace === 2) {
        const { data: lastPlayer } = await supabase
          .from('registrations')
          .select('user_id')
          .eq('tournament_id', tournamentId)
          .eq('eliminated', false)
          .single();

        if (lastPlayer) {
          await supabase
            .from('registrations')
            .update({ 
              eliminated: true,
              finish_place: 1  // Champion
            })
            .eq('tournament_id', tournamentId)
            .eq('user_id', lastPlayer.user_id);
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
  }
};

module.exports = tournamentController; 