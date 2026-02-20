-- Add notification viewing tracking columns to agreements table
-- These track whether a customer has viewed their payment charge

ALTER TABLE agreements
ADD COLUMN IF NOT EXISTS notification_viewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_viewed_channel VARCHAR(50);

-- Add index for efficient querying of viewed notifications
CREATE INDEX IF NOT EXISTS idx_agreements_notification_viewed
ON agreements(notification_viewed)
WHERE notification_viewed = true;

COMMENT ON COLUMN agreements.notification_viewed IS 'Whether the customer has viewed the payment link/charge';
COMMENT ON COLUMN agreements.notification_viewed_at IS 'When the customer viewed the payment link';
COMMENT ON COLUMN agreements.notification_viewed_channel IS 'Channel through which the notification was viewed (payment_link, email, sms, whatsapp)';
