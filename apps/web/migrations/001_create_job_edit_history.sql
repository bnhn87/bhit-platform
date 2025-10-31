-- Create job_edit_history table
CREATE TABLE IF NOT EXISTS job_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_edit_history_job_id ON job_edit_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_edit_history_user_id ON job_edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_edit_history_created_at ON job_edit_history(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE job_edit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow directors and ops to view edit history
CREATE POLICY "directors_and_ops_can_view_edit_history" 
ON job_edit_history FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('director', 'ops', 'admin')
    )
);

-- Allow all authenticated users to insert edit history (when they make changes)
CREATE POLICY "authenticated_can_insert_edit_history" 
ON job_edit_history FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());