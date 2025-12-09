-- Final fix: Update ALL scores of 0 to 5 in VMAX table
UPDATE "VMAX"
SET credit_score = 5
WHERE credit_score = 0
AND analysis_metadata IS NOT NULL;

-- Show results
SELECT 
  "Cliente",
  "CPF/CNPJ",
  credit_score,
  approval_status
FROM "VMAX"
WHERE credit_score = 5
AND analysis_metadata IS NOT NULL
ORDER BY last_analysis_date DESC;
