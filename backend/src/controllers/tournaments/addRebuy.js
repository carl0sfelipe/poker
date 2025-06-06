const { v4: uuidv4 } = require('uuid');
const supabase = require('../../config/supabase');

async function addRebuy(req, res) {
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
}

module.exports = addRebuy;
