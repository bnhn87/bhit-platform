-- Clear demo/mock data from activity_log table
-- This will remove all existing activity log entries
-- Real activity logging will start fresh from user actions

DELETE FROM activity_log;

-- Verify it's empty
SELECT COUNT(*) as remaining_entries FROM activity_log;
