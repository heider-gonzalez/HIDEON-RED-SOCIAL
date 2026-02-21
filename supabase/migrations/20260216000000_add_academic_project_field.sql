-- Add is_academic field to project_showcases table
ALTER TABLE project_showcases 
ADD COLUMN is_academic BOOLEAN DEFAULT FALSE;

-- Add index for better performance on academic projects queries
CREATE INDEX idx_project_showcases_is_academic ON project_showcases(is_academic);

-- Add comment to document the field
COMMENT ON COLUMN project_showcases.is_academic IS 'Indicates if the project is academic/university related (thesis, course project, research, etc.)';
