-- Add search_vector column to Document table
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for high-performance search
CREATE INDEX IF NOT EXISTS idx_document_search ON "Document" USING GIN(search_vector);

-- Update existing records to populate the vector
UPDATE "Document"
SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''));

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_document_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS tsvectorupdate ON "Document";
CREATE TRIGGER tsvectorupdate
BEFORE INSERT OR UPDATE ON "Document"
FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();
