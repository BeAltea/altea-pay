-- Fix risk_level constraint to accept both lowercase and uppercase
ALTER TABLE "VMAX" DROP CONSTRAINT IF EXISTS "VMAX_risk_level_check";

ALTER TABLE "VMAX" ADD CONSTRAINT "VMAX_risk_level_check" 
CHECK (risk_level IN ('low', 'medium', 'high', 'very_high', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'));

COMMENT ON CONSTRAINT "VMAX_risk_level_check" ON "VMAX" IS 'Accepts both lowercase and uppercase risk level values';
