export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  avatar_url?: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  content?: any;
  owner_id: string;
  workspace_id?: string;
  is_public: boolean;
  settings?: any;
  created_at: string;
  updated_at?: string;
}

export interface Block {
  id: string;
  document_id: string;
  block_type:
    | 'text'
    | 'heading'
    | 'table'
    | 'code'
    | 'image'
    | 'list'
    | 'quote'
    | 'divider';
  content: any;
  position: number;
  parent_id?: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

export interface Comment {
  id: string;
  thread_id: string;
  author_id: string;
  parent_id?: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at?: string;
  replies?: Comment[];
}

export interface CommentThread {
  id: string;
  document_id: string;
  block_id?: string;
  position?: string;
  is_resolved: boolean;
  created_at: string;
  updated_at?: string;
  comments?: Comment[];
}
