export interface ProjectTable {
  Row: {
    id: string;
    idea_id: string;
    name: string;
    description: string | null;
    owner_id: string;
    status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    idea_id: string;
    name: string;
    description?: string | null;
    owner_id: string;
    status?: 'planning' | 'in_progress' | 'completed' | 'on_hold';
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    idea_id?: string;
    name?: string;
    description?: string | null;
    owner_id?: string;
    status?: 'planning' | 'in_progress' | 'completed' | 'on_hold';
    created_at?: string;
    updated_at?: string;
  };
}
