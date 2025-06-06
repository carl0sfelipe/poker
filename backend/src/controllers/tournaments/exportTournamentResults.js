const supabase = require('../../config/supabase');

async function exportTournamentResults(req, res) {
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
  },
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = exportTournamentResults;
