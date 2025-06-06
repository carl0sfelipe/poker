const supabase = require('../../config/supabase');

async function getTournamentById(req, res) {
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
  }

}\n\nmodule.exports = getTournamentById;
