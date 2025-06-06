const { v4: uuidv4 } = require('uuid');
const supabase = require('../../config/supabase');

async function registerPlayer(req, res) {
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
}\n\nmodule.exports = registerPlayer;
