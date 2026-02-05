import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.hpjzlmurljxzwjtwcbkz',
  password: 'tsDJsPBA9MiBtyES',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected!\n');

    // Step 1: Clear existing data
    console.log('1. Clearing existing data from company_email_recipients...');
    await client.query('DELETE FROM company_email_recipients');
    console.log('   Data cleared!\n');

    // Step 2: Check VMAX table structure for email columns
    console.log('2. Checking VMAX table columns...');
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'VMAX'
      ORDER BY ordinal_position
    `);
    console.log('   VMAX columns:', columnsResult.rows.map(r => r.column_name).join(', '));
    console.log('');

    // Step 3: Fetch VMAX data with email
    console.log('3. Fetching VMAX contacts with email...');
    const vmaxResult = await client.query(`
      SELECT DISTINCT
        id_company,
        "Cliente" as client_name,
        "Email" as client_email
      FROM "VMAX"
      WHERE "Email" IS NOT NULL
        AND "Email" != ''
        AND "Email" LIKE '%@%'
      ORDER BY "Cliente"
    `);
    console.log(`   Found ${vmaxResult.rows.length} VMAX contacts with email\n`);

    if (vmaxResult.rows.length === 0) {
      // Try alternative column names
      console.log('   No "Email" column found, checking for alternative columns...');
      const altResult = await client.query(`
        SELECT * FROM "VMAX" LIMIT 1
      `);
      if (altResult.rows.length > 0) {
        console.log('   Sample VMAX row columns:', Object.keys(altResult.rows[0]).join(', '));
      }
    }

    // Step 4: Insert VMAX contacts
    console.log('4. Importing VMAX contacts to company_email_recipients...');
    let inserted = 0;
    let errors = 0;

    for (const row of vmaxResult.rows) {
      if (row.id_company && row.client_email) {
        try {
          await client.query(`
            INSERT INTO company_email_recipients (company_id, client_name, client_email)
            VALUES ($1, $2, $3)
            ON CONFLICT (company_id, client_email) DO NOTHING
          `, [row.id_company, row.client_name || 'Cliente', row.client_email.trim().toLowerCase()]);
          inserted++;
        } catch (e) {
          errors++;
        }
      }
    }
    console.log(`   Imported ${inserted} contacts (${errors} errors)\n`);

    // Step 5: Show results
    console.log('5. Verifying imported data...');
    const result = await client.query(`
      SELECT c.name as company_name, r.client_name, r.client_email
      FROM company_email_recipients r
      JOIN companies c ON r.company_id = c.id
      ORDER BY c.name, r.client_name
      LIMIT 20
    `);

    console.log('\n' + '='.repeat(90));
    console.log('Company                      | Client Name                    | Email');
    console.log('='.repeat(90));
    result.rows.forEach(row => {
      const company = (row.company_name || '').padEnd(28).slice(0, 28);
      const name = (row.client_name || '').padEnd(30).slice(0, 30);
      console.log(`${company} | ${name} | ${row.client_email}`);
    });
    console.log('='.repeat(90));

    const countResult = await client.query('SELECT COUNT(*) FROM company_email_recipients');
    console.log(`\nTotal recipients in database: ${countResult.rows[0].count}`);

    console.log('\n✅ Import complete!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

setup();
