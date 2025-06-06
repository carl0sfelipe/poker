const supabase = require('../../config/supabase');

async function addAddon(req, res) {
  try {
    const { id: tournamentId } = req.params;
    const { userId } = req.body;

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
}

module.exports = addAddon;
