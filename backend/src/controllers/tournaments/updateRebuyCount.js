const supabase = require('../../config/supabase');

async function updateRebuyCount(req, res) {
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
}\n\nmodule.exports = updateRebuyCount;
