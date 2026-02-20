/**
 * Script to configure ASAAS notifications for ALL existing VMAX customers to optimize costs.
 *
 * This script:
 * 1. Fetches all unique ASAAS customer IDs from agreements table
 * 2. For each customer, fetches their notifications from ASAAS
 * 3. Maps notifications by event + scheduleOffset
 * 4. Applies optimized configuration to save costs
 * 5. Uses rate limiting to avoid hitting ASAAS API limits
 *
 * Run with: node scripts/configure-asaas-notifications.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables from .env.local and .env
const envVars = {};

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      // Skip empty lines and comments
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[match[1].trim()] = value;
      }
    }
  } catch (err) {
    // File doesn't exist, ignore
  }
}

// Load .env first, then .env.local (local overrides)
loadEnvFile('.env');
loadEnvFile('.env.local');

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const asaasApiKey = envVars.ASAAS_API_KEY;
const asaasBaseUrl = envVars.ASAAS_API_URL || 'https://api.asaas.com/v3';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!asaasApiKey) {
  console.error('Missing ASAAS_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Optimized notification configuration
const OPTIMIZED_NOTIFICATION_CONFIG = {
  // PAYMENT_CREATED (scheduleOffset: 0) — We send our own email via Resend
  "PAYMENT_CREATED:0": {
    enabled: true,
    emailEnabledForProvider: false,
    smsEnabledForProvider: false,
    emailEnabledForCustomer: false, // We handle this via Resend
    smsEnabledForCustomer: true,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: true,
  },
  // PAYMENT_UPDATED (scheduleOffset: 0) — Only if value/date changes
  "PAYMENT_UPDATED:0": {
    enabled: false, // Turn off entirely
    emailEnabledForProvider: false,
    smsEnabledForProvider: false,
    emailEnabledForCustomer: false,
    smsEnabledForCustomer: false,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: false,
  },
  // PAYMENT_DUEDATE_WARNING (scheduleOffset: 10) — 10 days before due date
  "PAYMENT_DUEDATE_WARNING:10": {
    enabled: false, // Turn off (too early, spammy)
    emailEnabledForProvider: false,
    smsEnabledForProvider: false,
    emailEnabledForCustomer: false,
    smsEnabledForCustomer: false,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: false,
  },
  // PAYMENT_DUEDATE_WARNING (scheduleOffset: 0) — Due date day
  "PAYMENT_DUEDATE_WARNING:0": {
    enabled: true, // Keep (important reminder)
    emailEnabledForProvider: false,
    smsEnabledForProvider: false,
    emailEnabledForCustomer: true,
    smsEnabledForCustomer: true,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: true,
  },
  // SEND_LINHA_DIGITAVEL (scheduleOffset: 0) — Boleto digital line
  "SEND_LINHA_DIGITAVEL:0": {
    enabled: false, // Turn off (edge case, not worth the cost)
    emailEnabledForProvider: false,
    smsEnabledForProvider: false,
    emailEnabledForCustomer: false,
    smsEnabledForCustomer: false,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: false,
  },
  // PAYMENT_OVERDUE (scheduleOffset: 0) — First overdue alert
  "PAYMENT_OVERDUE:0": {
    enabled: true, // Keep
    emailEnabledForProvider: true, // Provider needs to know
    smsEnabledForProvider: false,
    emailEnabledForCustomer: true,
    smsEnabledForCustomer: true,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: true,
  },
  // PAYMENT_OVERDUE (scheduleOffset: 7) — Every 7 days overdue reminder
  "PAYMENT_OVERDUE:7": {
    enabled: true, // Keep (great for collections)
    emailEnabledForProvider: false,
    smsEnabledForProvider: false,
    emailEnabledForCustomer: true,
    smsEnabledForCustomer: true,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: true,
  },
  // PAYMENT_RECEIVED (scheduleOffset: 0) — Payment confirmed
  "PAYMENT_RECEIVED:0": {
    enabled: true, // Keep
    emailEnabledForProvider: true,
    smsEnabledForProvider: false,
    emailEnabledForCustomer: true,
    smsEnabledForCustomer: true,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: true,
  },
};

// ASAAS API helper
async function asaasRequest(endpoint, method = 'GET', body = null) {
  const url = `${asaasBaseUrl}${endpoint}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': asaasApiKey.trim(),
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ASAAS API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Get customer notifications
async function getCustomerNotifications(customerId) {
  const data = await asaasRequest(`/customers/${customerId}/notifications`);
  return data.data || [];
}

// Update notifications in batch
async function updateNotificationsBatch(customerId, notifications) {
  return asaasRequest('/notifications/batch', 'PUT', {
    customer: customerId,
    notifications,
  });
}

// Get customer details to check what contact info they have
async function getCustomerDetails(customerId) {
  try {
    const data = await asaasRequest(`/customers/${customerId}`);
    return {
      hasEmail: !!data.email,
      hasPhone: !!(data.phone || data.mobilePhone),
    };
  } catch (err) {
    // If we can't get details, assume they have both
    return { hasEmail: true, hasPhone: true };
  }
}

// Configure optimized notifications for a customer
async function configureCustomerNotifications(customerId, customerName) {
  const notifications = await getCustomerNotifications(customerId);

  if (!notifications || notifications.length === 0) {
    return { success: true, updated: 0, skipped: true };
  }

  // Check what contact info the customer has
  const { hasEmail, hasPhone } = await getCustomerDetails(customerId);

  const notificationsToUpdate = [];

  for (const notification of notifications) {
    const key = `${notification.event}:${notification.scheduleOffset ?? 0}`;
    const config = OPTIMIZED_NOTIFICATION_CONFIG[key];

    if (config) {
      // Clone the config and disable channels the customer doesn't have
      const adjustedConfig = { ...config };

      if (!hasEmail) {
        adjustedConfig.emailEnabledForCustomer = false;
        adjustedConfig.emailEnabledForProvider = false;
      }

      if (!hasPhone) {
        adjustedConfig.smsEnabledForCustomer = false;
        adjustedConfig.smsEnabledForProvider = false;
        adjustedConfig.phoneCallEnabledForCustomer = false;
        adjustedConfig.whatsappEnabledForCustomer = false;
      }

      notificationsToUpdate.push({
        id: notification.id,
        ...adjustedConfig,
      });
    }
  }

  if (notificationsToUpdate.length === 0) {
    return { success: true, updated: 0, skipped: true };
  }

  await updateNotificationsBatch(customerId, notificationsToUpdate);

  return { success: true, updated: notificationsToUpdate.length, hasEmail, hasPhone };
}

// Sleep helper for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
  console.log('='.repeat(70));
  console.log('ASAAS Notification Configuration Script');
  console.log('Optimizing notifications for all VMAX customers to save costs');
  console.log('='.repeat(70));
  console.log('');

  // Fetch all unique ASAAS customer IDs from agreements
  console.log('Fetching customers from database...');

  const { data: agreements, error } = await supabase
    .from('agreements')
    .select('asaas_customer_id, customers(name, document)')
    .not('asaas_customer_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching agreements:', error);
    process.exit(1);
  }

  // Deduplicate by asaas_customer_id
  const customerMap = new Map();
  for (const agreement of agreements) {
    if (agreement.asaas_customer_id && !customerMap.has(agreement.asaas_customer_id)) {
      customerMap.set(agreement.asaas_customer_id, {
        id: agreement.asaas_customer_id,
        name: agreement.customers?.name || 'Unknown',
        document: agreement.customers?.document || '',
      });
    }
  }

  const customers = Array.from(customerMap.values());
  console.log(`Found ${customers.length} unique ASAAS customers to configure\n`);

  if (customers.length === 0) {
    console.log('No customers to configure. Exiting.');
    return;
  }

  // Process each customer
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const failures = [];

  console.log('Starting notification configuration...\n');
  console.log('-'.repeat(70));

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const progress = `[${i + 1}/${customers.length}]`;

    try {
      const result = await configureCustomerNotifications(customer.id, customer.name);

      if (result.skipped) {
        skippedCount++;
        console.log(`${progress} SKIPPED: ${customer.name} (no notifications to configure)`);
      } else {
        successCount++;
        console.log(`${progress} SUCCESS: ${customer.name} (${result.updated} notifications updated)`);
      }
    } catch (err) {
      failureCount++;
      failures.push({ customer, error: err.message });
      console.log(`${progress} FAILED: ${customer.name} - ${err.message}`);
    }

    // Rate limiting: 250ms delay between requests
    if (i < customers.length - 1) {
      await sleep(250);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total customers processed: ${customers.length}`);
  console.log(`Successful updates: ${successCount}`);
  console.log(`Skipped (no notifications): ${skippedCount}`);
  console.log(`Failed: ${failureCount}`);

  if (failures.length > 0) {
    console.log('\nFailed customers:');
    for (const f of failures) {
      console.log(`  - ${f.customer.name} (${f.customer.id}): ${f.error}`);
    }
  }

  console.log('\nConfiguration changes applied:');
  console.log('  - PAYMENT_CREATED: Email OFF (we use Resend), SMS/WhatsApp ON');
  console.log('  - PAYMENT_UPDATED: Disabled entirely');
  console.log('  - PAYMENT_DUEDATE_WARNING (10 days): Disabled');
  console.log('  - PAYMENT_DUEDATE_WARNING (due date): All channels ON');
  console.log('  - SEND_LINHA_DIGITAVEL: Disabled');
  console.log('  - PAYMENT_OVERDUE (first): All channels ON');
  console.log('  - PAYMENT_OVERDUE (7 days): All channels ON');
  console.log('  - PAYMENT_RECEIVED: All channels ON');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
