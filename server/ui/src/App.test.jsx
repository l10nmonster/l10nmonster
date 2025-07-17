import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App.jsx';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ element }) => <div data-testid="route">{element}</div>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock Chakra UI components
vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }) => <div data-testid="box" {...props}>{children}</div>,
  Container: ({ children, ...props }) => <div data-testid="container" {...props}>{children}</div>,
  Heading: ({ children, ...props }) => <h1 data-testid="heading" {...props}>{children}</h1>,
  Flex: ({ children, ...props }) => <div data-testid="flex" {...props}>{children}</div>,
  Spinner: ({ ...props }) => <div data-testid="spinner" {...props}>Loading...</div>,
  Tabs: {
    Root: ({ children, ...props }) => <div data-testid="tabs-root" {...props}>{children}</div>,
    List: ({ children, ...props }) => <div data-testid="tabs-list" role="tablist" {...props}>{children}</div>,
    Trigger: ({ children, value, ...props }) => <button data-testid="tab-trigger" role="tab" data-value={value} {...props}>{children}</button>,
    Content: ({ children, value, ...props }) => <div data-testid="tabs-content" data-value={value} {...props}>{children}</div>,
  },
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

  // it('renders the main layout structure', () => {
  //   render(<App />);
    
  //   // Check if the L10n Monster heading exists
  //   const heading = screen.getByTestId('heading');
  //   expect(heading).toBeInTheDocument();
  //   expect(heading).toHaveTextContent('L10n Monster');
    
  //   // Check if navigation tabs are present
  //   const homeTab = screen.getByRole('tab', { name: /home/i });
  //   const statusTab = screen.getByRole('tab', { name: /status/i });
  //   const sourcesTab = screen.getByRole('tab', { name: /sources/i });
  //   const tmTab = screen.getByRole('tab', { name: /tm/i });
    
  //   expect(homeTab).toBeInTheDocument();
  //   expect(statusTab).toBeInTheDocument();
  //   expect(sourcesTab).toBeInTheDocument();
  //   expect(tmTab).toBeInTheDocument();
  // });

  it('renders the router structure', () => {
    render(<App />);
    
    // Check if router components are rendered
    expect(screen.getByTestId('router')).toBeInTheDocument();
    expect(screen.getByTestId('routes')).toBeInTheDocument();
  });
}); 