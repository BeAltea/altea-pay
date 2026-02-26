// TEMPORARY DEBUG ENDPOINT - DELETE AFTER FIXING
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: Record<string, any> = {};

  // 1. ALL Supabase Auth users (master list of everyone who can log in)
  try {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    results.authUsers = data?.users?.map(u => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata,
    })) || [];
    results.authUserCount = results.authUsers.length;
  } catch (e: any) {
    results.authUsersError = e.message;
  }

  // 2. Profiles table
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data) {
      results.profiles = {
        count: data.length,
        columns: data[0] ? Object.keys(data[0]) : [],
        rows: data,
      };
    } else {
      results.profilesError = error?.message;
    }
  } catch (e: any) {
    results.profilesError = e.message;
  }

  // 3. Try other possible user/profile tables
  const tablesToTry = [
    'users', 'company_users', 'members',
    'accounts', 'user_profiles', 'team_members',
    'user_companies', 'company_members', 'access',
    'user_roles', 'permissions'
  ];

  for (const table of tablesToTry) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(50);
      if (!error && data && data.length > 0) {
        results[table] = {
          count: data.length,
          columns: data[0] ? Object.keys(data[0]) : [],
          rows: data,
        };
      }
    } catch (e) {
      // Table doesn't exist, skip
    }
  }

  // 4. Companies table
  try {
    const { data } = await supabase.from('companies').select('*');
    results.companies = {
      count: data?.length || 0,
      rows: data?.map(c => ({
        id: c.id,
        name: c.name,
        document: c.document,
        email: c.email,
      })),
    };
  } catch (e: any) {
    results.companiesError = e.message;
  }

  // 5. Analysis: Match auth users to profiles
  results.analysis = {
    authUsersWithoutProfile: results.authUsers?.filter((au: any) =>
      !results.profiles?.rows?.some((p: any) => p.id === au.id)
    ).map((au: any) => ({ id: au.id, email: au.email })),

    profilesWithCompany: results.profiles?.rows?.filter((p: any) => p.company_id)?.length || 0,
    profilesWithoutCompany: results.profiles?.rows?.filter((p: any) => !p.company_id)?.length || 0,

    profilesByRole: results.profiles?.rows?.reduce((acc: any, p: any) => {
      acc[p.role || 'no_role'] = (acc[p.role || 'no_role'] || 0) + 1;
      return acc;
    }, {}),
  };

  return NextResponse.json(results, { status: 200 });
}
