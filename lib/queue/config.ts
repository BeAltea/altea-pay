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
  // ASAAS Batch Queues
  asaasChargeCreate: {
    name: 'alteapay-asaas-charge-create',
    retries: {
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 3000,
      },
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    limiter: {
      max: 10,
      duration: 1000, // 10 requests/second
    },
  },
  asaasChargeUpdate: {
    name: 'alteapay-asaas-charge-update',
    retries: {
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 3000,
      },
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
  asaasChargeCancel: {
    name: 'alteapay-asaas-charge-cancel',
    retries: {
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 3000,
      },
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
  asaasNotification: {
    name: 'alteapay-asaas-notification',
    retries: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
  asaasSync: {
    name: 'alteapay-asaas-sync',
    retries: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
    limiter: {
      max: 10,
      duration: 1000,
    },
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
