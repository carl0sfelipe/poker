const bcrypt = require('bcrypt');
const supabase = require('../../config/supabase');

async function deleteTournament(req, res) {
      const { id } = req.params;
      const { forceDelete, password } = req.body;

      // Primeiro, verifica se o torneio existe
      const { data: tournament, error: findError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      // Trata especificamente o erro PGRST116 (nenhuma linha encontrada)
      if (findError) {
        if (findError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Tournament not found' });
        }
        throw findError;
      }

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Verifica se o torneio pode ser deletado normalmente (status deve ser 'pending')
      let needsForceDelete = tournament.status !== 'pending';

      // Verifica se há jogadores registrados
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('id')
        .eq('tournament_id', id);

      if (regError) throw regError;
      
      // Se tem jogadores registrados, precisa de force delete
      if (registrations && registrations.length > 0) {
        needsForceDelete = true;
      }

      // Se precisa de force delete e não foi fornecido, retorna erro
      if (needsForceDelete && !forceDelete) {
        return res.status(409).json({ 
          error: 'Cannot delete tournament that has already started or has registered players',
          requiresForceDelete: true
        });
      }

      // Se foi solicitado force delete, verifica a senha
      if (forceDelete) {
        // Busca o hash da senha do usuário
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('password_hash')
          .eq('id', req.user.id)
          .single();

        if (userError) throw userError;
        
        // Verifica se a senha está correta
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Deleta o torneio
      const { error: deleteError } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Retorna sucesso com status 204 (No Content)
      res.status(204).send();
    } catch (error) {
      console.error('Delete tournament error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
}\n\nmodule.exports = deleteTournament;
