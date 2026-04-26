const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('A variável SUPABASE_URL não foi configurada no microserviço de autenticação.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('A variável SUPABASE_SERVICE_ROLE_KEY não foi configurada no microserviço de autenticação.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabaseAdmin;
