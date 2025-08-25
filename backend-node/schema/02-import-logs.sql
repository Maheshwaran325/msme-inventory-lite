-- Drop the table first if it exists
DROP TABLE IF EXISTS import_logs;

-- Now drop the type if it exists
DROP TYPE IF EXISTS import_status CASCADE;

-- Custom type for tracking status
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Logs table (MVP, no child table)
CREATE TABLE import_logs (
    id bigserial PRIMARY KEY,
    filename text NOT NULL,
    file_hash text NOT NULL UNIQUE,              
    status import_status NOT NULL DEFAULT 'pending',
    total_rows integer NOT NULL DEFAULT 0,
    successful_rows integer NOT NULL DEFAULT 0,
    failed_rows integer NOT NULL DEFAULT 0,
    results jsonb,                              
    imported_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reuse timestamp updater
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON import_logs
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imports"
    ON import_logs FOR SELECT TO authenticated
    USING (imported_by = auth.uid());

CREATE POLICY "Users can create their own imports"
    ON import_logs FOR INSERT TO authenticated
    WITH CHECK (imported_by = auth.uid());