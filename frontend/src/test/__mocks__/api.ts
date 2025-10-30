// Mock API responses
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  avatar_url: null,
  bio: null,
  is_active: true,
  is_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: null,
};

export const mockWorkspace = {
  id: 'workspace-123',
  name: 'Test Workspace',
  description: 'A test workspace',
  slug: 'test-workspace',
  avatar_url: null,
  owner_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: null,
};

export const mockDocument = {
  id: 'document-123',
  title: 'Test Document',
  description: 'A test document',
  content: { blocks: [] },
  owner_id: 'user-123',
  workspace_id: 'workspace-123',
  is_public: false,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: null,
};

export const mockDocuments = [mockDocument];
export const mockWorkspaces = [mockWorkspace];
