/**
 * BullMQ Queue Configuration
 */

export const QUEUE_CONFIG = {
  email: {
    name: 'alteapay-email',
    retries: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
  charge: {
    name: 'alteapay-charge',
    retries: {
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 3000,
      },
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
} as const;

// ASAAS notification defaults - WhatsApp + SMS enabled, email disabled (we use SendGrid)
export const ASAAS_NOTIFICATION_DEFAULTS = {
  enabled: true,
  emailEnabledForProvider: false,
  smsEnabledForProvider: false,
  emailEnabledForCustomer: false,
  smsEnabledForCustomer: true,
  phoneCallEnabledForCustomer: false,
  whatsappEnabledForCustomer: true,
} as const;
