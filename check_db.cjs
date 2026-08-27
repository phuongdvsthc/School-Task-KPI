const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('system_settings').select('*').limit(1).then(r => console.log(r)).catch(console.error);
