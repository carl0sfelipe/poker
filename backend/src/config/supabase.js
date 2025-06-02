const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://xdtempazofwyapgjtbdm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdGVtcGF6b2Z3eWFwZ2p0YmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODYxOTcsImV4cCI6MjA2NDQ2MjE5N30.jZebLl5nCuDX3vORjBn1PNIj97PwJxTWLR6Eh6d7kDc';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 