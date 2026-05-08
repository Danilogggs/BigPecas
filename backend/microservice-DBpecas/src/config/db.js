const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('A variável SUPABASE_URL não foi configurada no microservice-DBpecas.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('A variável SUPABASE_SERVICE_ROLE_KEY não foi configurada no microservice-DBpecas.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('Conexão com Supabase configurada no microservice-DBpecas.');

module.exports = supabase;
