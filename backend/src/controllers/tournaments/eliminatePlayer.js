const supabase = require('../../config/supabase');

async function eliminatePlayer(req, res) {
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
}\n\nmodule.exports = eliminatePlayer;
