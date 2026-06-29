const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("WARNING: Supabase URL or Anon Key is missing from environment variables!");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
