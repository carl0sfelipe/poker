const supabase = require('../../config/supabase');

async function checkInPlayer(req, res) {
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
  }
}\n\nmodule.exports = checkInPlayer;
