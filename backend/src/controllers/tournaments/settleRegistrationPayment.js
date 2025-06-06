const supabase = require('../../config/supabase');

async function settleRegistrationPayment(req, res) {
      const { id: tournamentId } = req.params;
      const { 
        userId, 
        confirmPayment, 
        includeAddon, 
        includeBuyIn, 
        selectedBonuses = [],
        selectedBonusAddons = [] 
      } = req.body;

      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

      if (regError) throw regError;
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      if (!confirmPayment) {
        const { data, error } = await supabase
          .from('registrations')
          .update({ payment_status: 'eliminated', eliminated: true })
          .eq('id', registration.id)
          .select()
          .single();

        if (error) throw error;
        return res.json(data);
      }

      const updates = {
        rebuys_paid: true,
        payment_status: 'paid',
        payment_timestamp: new Date().toISOString()
      };

      // Processar pagamento do buy-in
      if (includeBuyIn) {
        updates.buy_in_paid = true;
      }

      // Obter dados do torneio para informações sobre os bônus e seus addons
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('bonuses, addon')
        .eq('id', tournamentId)
        .single();

      // Processar pagamento dos bônus
      if (selectedBonuses && selectedBonuses.length > 0) {
        // Manter os bônus que o jogador já tinha e adicionar os novos
        const currentBonuses = registration.selected_bonuses || [];
        const allBonuses = [...new Set([...currentBonuses, ...selectedBonuses])];
        
        // Atualizar quais bônus estão marcados como pagos
        const paidBonuses = registration.bonuses_paid || [];
        updates.selected_bonuses = allBonuses;
        updates.bonuses_paid = [...new Set([...paidBonuses, ...selectedBonuses])];
        
        // Recalcular o stack adicionando os novos bônus selecionados
        // Adicionar stack apenas para novos bônus selecionados
        const newBonuses = selectedBonuses.filter(bonus => !currentBonuses.includes(bonus));
        let additionalStack = 0;
        
        if (tournament && tournament.bonuses) {
          newBonuses.forEach(bonusName => {
            const bonus = tournament.bonuses.find(b => b.name === bonusName);
            if (bonus) {
              additionalStack += bonus.stack;
            }
          });
        }
        
        if (additionalStack > 0) {
          updates.current_stack = (registration.current_stack || 0) + additionalStack;
        }
      }

      // Processar os addons de bônus
      if (selectedBonusAddons && selectedBonusAddons.length > 0) {
        const currentBonusAddons = registration.bonus_addons_used || [];
        const newBonusAddons = selectedBonusAddons.filter(addon => !currentBonusAddons.includes(addon));
        
        // Verificar se existem novos addons de bônus e adicionar suas fichas ao stack
        if (newBonusAddons.length > 0 && tournament?.bonuses) {
          let addonAdditionalStack = 0;
          
          newBonusAddons.forEach(bonusName => {
            const bonus = tournament.bonuses.find(b => b.name === bonusName);
            if (bonus && bonus.addon) {
              addonAdditionalStack += bonus.addon.stack;
            }
          });
          
          // Atualizar o stack atual com as fichas adicionais dos addons de bônus
          if (addonAdditionalStack > 0) {
            updates.current_stack = (updates.current_stack || registration.current_stack || 0) + addonAdditionalStack;
          }
          
          // Atualizar a lista de addons de bônus usados
          updates.bonus_addons_used = [...new Set([...currentBonusAddons, ...newBonusAddons])];
        }
      }

      // Processar pagamento e uso do addon padrão do torneio
      if (registration.addon_used && !registration.addon_paid) {
        updates.addon_paid = true;
      }

      if (includeAddon && !registration.addon_used && tournament?.addon?.allowed) {
        updates.current_stack = (updates.current_stack || registration.current_stack || 0) + tournament.addon.stack;
        updates.addon_used = true;
        updates.addon_paid = true;
      }

      console.log('Settle payment update to be sent:', JSON.stringify(updates, null, 2));
      const { data, error } = await supabase
        .from('registrations')
        .update(updates)
        .eq('id', registration.id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Settle payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
}\n\nmodule.exports = settleRegistrationPayment;
