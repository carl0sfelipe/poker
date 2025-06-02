/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  // Create users table
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    role: { type: 'varchar(20)', notNull: true, default: 'player' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Create tournaments table
  pgm.createTable('tournaments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(255)', notNull: true },
    start_time: { type: 'timestamp', notNull: true },
    starting_stack: { type: 'integer', notNull: true },
    blind_structure: { type: 'jsonb', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Create registrations table
  pgm.createTable('registrations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { 
      type: 'uuid', 
      notNull: true, 
      references: '"users"',
      onDelete: 'CASCADE'
    },
    tournament_id: { 
      type: 'uuid', 
      notNull: true, 
      references: '"tournaments"',
      onDelete: 'CASCADE'
    },
    checked_in: { type: 'boolean', notNull: true, default: false },
    seat_number: { type: 'integer' },
    table_number: { type: 'integer' },
    finish_place: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Add indexes
  pgm.createIndex('users', 'email');
  pgm.createIndex('registrations', ['user_id', 'tournament_id'], { unique: true });
};

exports.down = pgm => {
  pgm.dropTable('registrations');
  pgm.dropTable('tournaments');
  pgm.dropTable('users');
}; 