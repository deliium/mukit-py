import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Dashboard } from '../../pages/Dashboard';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock react-query
vi.mock('react-query', () => ({
  useQuery: () => ({
    data: [],
    refetch: vi.fn(),
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {component}
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard content', () => {
    renderWithRouter(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Recent Documents')).toBeInTheDocument();
  });

  it('shows create buttons', () => {
    renderWithRouter(<Dashboard />);

    expect(screen.getByText('New Workspace')).toBeInTheDocument();
    expect(screen.getByText('New Document')).toBeInTheDocument();
  });
});
