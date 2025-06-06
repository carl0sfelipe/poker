const { v4: uuidv4 } = require('uuid');
const supabase = require('../../config/supabase');
const bcrypt = require('bcrypt');

async function createTournament(req, res) {
    try {
      console.log('Received tournament creation request:', JSON.stringify(req.body, null, 2));
      
      const { 
        name, 
        start_time, 
        starting_stack,
        blind_structure,
        bonuses = [], 
        addon = {
          allowed: false,
          stack: 0,
          price: 0
        },
        rebuy = {
          allowed: false,
          single: {
            stack: 0,
            price: 0
          },
          double: {
            stack: 0,
            price: 0
          }
        },
        buy_in,
        addonBonuses = [] // <-- novo campo
      } = req.body;

      // Validate required fields
      if (!name || !start_time || !starting_stack || !blind_structure) {
        console.error('Missing required fields:', { name, start_time, starting_stack, blind_structure });
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: {
            name: !name,
            start_time: !start_time,
            starting_stack: !starting_stack,
            blind_structure: !blind_structure
          }
        });
      }

      // Validate bonus structure if any bonuses are provided
      if (bonuses.length > 0) {
        const invalidBonuses = bonuses.filter(bonus => {
          // Check for required fields
          if (!bonus.name || !bonus.stack || !bonus.condition) {
            return true;
          }
          
          // Validate name format (at least 3 chars, alphanumeric with spaces)
          const validName = typeof bonus.name === 'string' && 
                          bonus.name.trim().length >= 3 &&
                          /^[a-zA-Z0-9\s]+$/.test(bonus.name.trim());
          
          // Validate condition (at least 5 chars)
          const validCondition = typeof bonus.condition === 'string' && 
                               bonus.condition.trim().length >= 5;
          
          // Validate stack (must be positive number)
          const validStack = typeof bonus.stack === 'number' && 
                           Number.isInteger(bonus.stack) && 
                           bonus.stack > 0;
          
          return !validName || !validCondition || !validStack;
        });

        if (invalidBonuses.length > 0) {
          console.error('Invalid bonus structure:', invalidBonuses);
          return res.status(400).json({ 
            error: 'Invalid bonus structure', 
            details: 'Each bonus must have a valid name (3+ alphanumeric chars), condition (5+ chars), and positive stack value',
            invalidBonuses 
          });
        }
      }

      // Validate addon if enabled
      if (addon.allowed) {
        if (!addon.stack || !addon.price) {
          console.error('Invalid addon configuration:', addon);
          return res.status(400).json({ 
            error: 'Invalid addon configuration',
            details: 'Add-on must have stack and price when allowed'
          });
        }
      }

      // Validate rebuy if enabled
      if (rebuy.allowed) {
        const rebuyErrors = [];
        if (!rebuy.single?.stack || !rebuy.single?.price) {
          rebuyErrors.push('Single rebuy must have stack and price when allowed');
        }
        if (!rebuy.double?.stack || !rebuy.double?.price) {
          rebuyErrors.push('Double rebuy must have stack and price when allowed');
        }
        if (rebuyErrors.length > 0) {
          console.error('Invalid rebuy configuration:', { rebuy, errors: rebuyErrors });
          return res.status(400).json({ 
            error: 'Invalid rebuy configuration',
            details: rebuyErrors
          });
        }
      }

      // Garante que addon_bonuses sempre seja um array, mesmo se vier objeto do front
      let formattedAddonBonuses = [];
      if (addon && addon.bonus) {
        if (Array.isArray(addon.bonus)) {
          formattedAddonBonuses = addon.bonus.map(bonus => ({
            name: String(bonus.name || '').trim().replace(/[^a-zA-Z0-9\s]/g, ''),
            stack: Number(bonus.stack),
            price: Number(bonus.price || 0)
          }));
        } else if (typeof addon.bonus === 'object') {
          const bonus = addon.bonus;
          formattedAddonBonuses = [{
            name: String(bonus.name || '').trim().replace(/[^a-zA-Z0-9\s]/g, ''),
            stack: Number(bonus.stack),
            price: Number(bonus.price || 0)
          }];
        }
      }

      // Format bonus data - ensure it's a proper JSONB array
      const formattedBonuses = bonuses.map(bonus => ({
        name: String(bonus.name || '').trim().replace(/[^a-zA-Z0-9\s]/g, ''),
        stack: Number(bonus.stack),
        price: Number(bonus.price || 0),
        condition: String(bonus.condition || '').trim()
      }));

      // Format addon data with explicit type conversion
      const formattedAddon = {
        allowed: Boolean(addon.allowed),
        stack: parseInt(addon.stack || 0),
        price: parseInt(addon.price || 0)
      };

      // Format rebuy data with explicit type conversion
      const formattedRebuy = {
        allowed: Boolean(rebuy.allowed),
        single: {
          stack: parseInt(rebuy.single?.stack || 0),
          price: parseInt(rebuy.single?.price || 0)
        },
        double: {
          stack: parseInt(rebuy.double?.stack || 0),
          price: parseInt(rebuy.double?.price || 0)
        }
      };

      // Normalize blind structure
      const normalizedBlindStructure = blind_structure.map(level => ({
        level: parseInt(level.level),
        smallBlind: parseInt(level.small_blind || level.smallBlind),
        bigBlind: parseInt(level.big_blind || level.bigBlind),
        duration: parseInt(level.duration)
      }));

      // Create the tournament data object
      const tournamentData = {
        id: uuidv4(),
        name: String(name).trim(),
        start_time,
        starting_stack: Number(starting_stack),
        blind_structure: normalizedBlindStructure,
        status: 'pending',
        bonuses: formattedBonuses, // Send as array of objects
        addon: formattedAddon,
        rebuy: formattedRebuy,
        buy_in: parseInt(buy_in || 0),
        addon_bonuses: formattedAddonBonuses
      };

      // Log only the bonuses field for debugging
      console.log('Bonuses to be sent:', JSON.stringify(tournamentData.bonuses));

      // LOG ÚNICO PARA DEBUG: GITHUB COPILOT DEBUG - DADOS ENVIADOS PARA O SUPABASE
      console.log('GITHUB COPILOT DEBUG - DADOS ENVIADOS PARA O SUPABASE:', JSON.stringify(tournamentData, null, 2));

      try {
        const { data, error } = await supabase
          .from('tournaments')
          .insert([tournamentData])
          .select()
          .single();

        if (error) {
          // Log only the error and bonuses field
          console.error('Supabase error:', error.message, 'Bonuses:', JSON.stringify(tournamentData.bonuses));
          return res.status(500).json({
            error: 'Database error',
            message: error.message,
            code: error.code
          });
        }
        res.status(201).json(data);
      } catch (error) {
        // Log only the error and bonuses field
        console.error('Create tournament error:', error.message, 'Bonuses:', JSON.stringify(tournamentData.bonuses));
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        details: error.details || error.hint || 'No additional details',
        type: error.constructor.name
      });
    }
}

module.exports = createTournament;
