/**
 * Script to create the first admin user
 * Run with: node scripts/create-first-admin.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createFirstAdmin() {
  console.log('🚀 Creating first admin user...\n');

  // Get user input (you can modify these values)
  const email = 'admin@bhit.com'; // CHANGE THIS
  const password = 'admin123456';  // CHANGE THIS
  const fullName = 'Admin User';   // CHANGE THIS

  console.log('Email:', email);
  console.log('Password:', '***********');
  console.log('Full Name:', fullName);
  console.log('Role: director\n');

  try {
    // Step 1: Check if account exists, create if not
    const { data: accounts, error: accountCheckError } = await supabase
      .from('accounts')
      .select('id')
      .limit(1);

    let accountId;

    if (accountCheckError || !accounts || accounts.length === 0) {
      console.log('📝 Creating default account...');
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: 'Default Organization',
          is_active: true
        })
        .select()
        .single();

      if (accountError) {
        throw new Error('Failed to create account: ' + accountError.message);
      }

      accountId = newAccount.id;
      console.log('✓ Account created:', accountId, '\n');
    } else {
      accountId = accounts[0].id;
      console.log('✓ Using existing account:', accountId, '\n');
    }

    // Step 2: Create auth user
    console.log('👤 Creating auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'director'
      }
    });

    if (authError) {
      throw new Error('Failed to create auth user: ' + authError.message);
    }

    console.log('✓ Auth user created:', authUser.user.id, '\n');

    // Step 3: Create user profile
    console.log('📋 Creating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        full_name: fullName,
        role: 'director',
        account_id: accountId,
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      throw new Error('Failed to create profile: ' + profileError.message);
    }

    console.log('✓ Profile created\n');

    // Step 4: Create permissions
    console.log('🔐 Creating permissions...');
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: authUser.user.id,
        can_create_jobs: true,
        can_edit_jobs: true,
        can_delete_jobs: true,
        can_view_costs: true,
        can_edit_costs: true,
        can_view_invoices: true,
        can_create_invoices: true,
        can_edit_invoices: true,
        can_manage_users: true,
        can_edit_org_settings: true,
        can_view_reports: true,
        can_export_data: true
      });

    if (permError) {
      throw new Error('Failed to create permissions: ' + permError.message);
    }

    console.log('✓ Permissions created\n');

    // Step 5: Create cost access
    console.log('💰 Creating cost access...');
    const { error: costError } = await supabase
      .from('cost_access')
      .insert({
        user_id: authUser.user.id,
        has_access: true,
        granted_by: authUser.user.id
      });

    if (costError) {
      throw new Error('Failed to create cost access: ' + costError.message);
    }

    console.log('✓ Cost access created\n');

    console.log('✅ SUCCESS! Admin user created:\n');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role: director');
    console.log('   User ID:', authUser.user.id);
    console.log('\n🌐 You can now login at: http://localhost:3000/login\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

createFirstAdmin();
