#!/usr/bin/env node
// Usage: node set-tier.js <email> <tier>
// tier: 'free' | 'paid'

import { createClient } from '@supabase/supabase-js';

const [email, tier] = process.argv.slice(2);

if (!email || !['free', 'paid'].includes(tier)) {
  console.error('Usage: node set-tier.js <email> <tier>  (tier: free | paid)');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Look up the user by email via the admin auth API
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
if (listError) { console.error(listError.message); process.exit(1); }

const user = users.find(u => u.email === email);
if (!user) { console.error(`No user found with email: ${email}`); process.exit(1); }

const { error } = await supabase
  .from('users')
  .update({ tier })
  .eq('id', user.id);

if (error) { console.error(error.message); process.exit(1); }

console.log(`✓ ${email} → tier: ${tier}`);
