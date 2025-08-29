import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App.jsx';

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }) => <div data-testid="query-client-provider">{children}</div>,
  useQuery: () => ({ data: null, isLoading: false, error: null }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ element }) => <div data-testid="route">{element}</div>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({ jobGuid: 'test-job-guid' }),
}));

// Mock Chakra UI components
vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }) => <div data-testid="box" {...props}>{children}</div>,
  Container: ({ children, ...props }) => <div data-testid="container" {...props}>{children}</div>,
  Heading: ({ children, ...props }) => <h1 data-testid="heading" {...props}>{children}</h1>,
  Flex: ({ children, ...props }) => <div data-testid="flex" {...props}>{children}</div>,
  Spinner: ({ ...props }) => <div data-testid="spinner" {...props}>Loading...</div>,
  Text: ({ children, ...props }) => <span data-testid="text" {...props}>{children}</span>,
  VStack: ({ children, ...props }) => <div data-testid="vstack" {...props}>{children}</div>,
  HStack: ({ children, ...props }) => <div data-testid="hstack" {...props}>{children}</div>,
  Badge: ({ children, ...props }) => <span data-testid="badge" {...props}>{children}</span>,
  Alert: ({ children, ...props }) => <div data-testid="alert" {...props}>{children}</div>,
  Button: ({ children, ...props }) => <button data-testid="button" {...props}>{children}</button>,
  Collapsible: ({ children, ...props }) => <div data-testid="collapsible" {...props}>{children}</div>,
  Tabs: {
    Root: ({ children, ...props }) => <div data-testid="tabs-root" {...props}>{children}</div>,
    List: ({ children, ...props }) => <div data-testid="tabs-list" role="tablist" {...props}>{children}</div>,
    Trigger: ({ children, value, ...props }) => <button data-testid="tab-trigger" role="tab" data-value={value} {...props}>{children}</button>,
    Content: ({ children, value, ...props }) => <div data-testid="tabs-content" data-value={value} {...props}>{children}</div>,
  },
}));

// Mock utils/api
vi.mock('../utils/api', () => ({
  fetchApi: vi.fn().mockResolvedValue({}),
}));

// Mock page components
vi.mock('./pages/Welcome.jsx', () => ({
  default: () => <div data-testid="welcome-page">Welcome Page</div>,
}));

vi.mock('./pages/Status.jsx', () => ({
  default: () => <div data-testid="status-page">Status Page</div>,
}));

vi.mock('./pages/Sources.jsx', () => ({
  default: () => <div data-testid="sources-page">Sources Page</div>,
}));

vi.mock('./pages/TM.jsx', () => ({
  default: () => <div data-testid="tm-page">TM Page</div>,
}));

vi.mock('./pages/NotFoundPage.jsx', () => ({
  default: () => <div data-testid="not-found-page">Not Found Page</div>,
}));

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('renders the router structure', () => {
    render(<App />);
    
    // Check if router components are rendered
    expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });
}); 