-- Delete all old credit profile analyses to force fresh analysis with real API data
-- This will remove the cached analyses with score 500 and allow new real API calls

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all credit profiles for the VMAX company
  DELETE FROM credit_profiles
  WHERE company_id = '1f7729ee-a537-43fc-a27f-5747c177988d';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % old credit profile records', deleted_count;
  RAISE NOTICE 'Now you can run "Analisar Todos" to perform fresh analyses with real API data';
END $$;
