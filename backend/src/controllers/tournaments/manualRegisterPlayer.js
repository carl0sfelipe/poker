const { v4: uuidv4 } = require('uuid');
const supabase = require('../../config/supabase');
const bcrypt = require('bcrypt');

async function manualRegisterPlayer(req, res) {
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
  }
}\n\nmodule.exports = manualRegisterPlayer;
