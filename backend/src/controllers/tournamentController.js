const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

const tournamentController = {
  async create(req, res) {
    try {
      const { name, start_time, starting_stack, blind_structure } = req.body;
      
      const { data, error } = await supabase
        .from('tournaments')
        .insert([
          {
            id: uuidv4(),
            name,
            start_time,
            starting_stack,
            blind_structure,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error('Create tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
              email
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
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

      const { data, error } = await supabase
        .from('registrations')
        .insert([
          {
            id: uuidv4(),
            user_id: userId,
            tournament_id: tournamentId,
            checked_in: false
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

      // Get current highest finish place
      const { data: highestPlace } = await supabase
        .from('registrations')
        .select('finish_place')
        .eq('tournament_id', tournamentId)
        .order('finish_place', { ascending: false })
        .limit(1)
        .single();

      const nextPlace = (highestPlace?.finish_place || 0) + 1;

      const { data, error } = await supabase
        .from('registrations')
        .update({ finish_place: nextPlace })
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
  }
};

module.exports = tournamentController; 