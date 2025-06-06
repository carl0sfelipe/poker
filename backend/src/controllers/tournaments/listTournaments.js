const supabase = require('../../config/supabase');

async function listTournaments(req, res) {
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
  }
}\n\nmodule.exports = listTournaments;
