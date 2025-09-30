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
  Link: ({ children, to, ...props }) => <a href={to} data-testid="link" {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({ jobGuid: 'test-job-guid' }),
}));

// Helper function to filter out Chakra UI props that are not valid DOM attributes
const filterProps = (props) => {
  const domProps = { ...props };
  // Remove Chakra UI-specific props that cause React warnings
  delete domProps.bg;
  delete domProps.minH;
  delete domProps.borderBottom;
  delete domProps.borderColor;
  delete domProps.borderRadius;
  delete domProps.justifyContent;
  delete domProps.alignItems;
  delete domProps.align;
  delete domProps.justify;
  delete domProps.gap;
  delete domProps.px;
  delete domProps.py;
  delete domProps.size;
  delete domProps.fontWeight;
  delete domProps.fontSize;
  delete domProps.color;
  delete domProps.cursor;
  delete domProps._hover;
  delete domProps.colorPalette;
  delete domProps.variant;
  delete domProps.shadow;
  delete domProps.overflow;
  delete domProps.maxW;
  delete domProps.flexWrap;
  delete domProps.borderWidth;
  return domProps;
};

// Mock Chakra UI components
vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }) => <div data-testid="box" {...filterProps(props)}>{children}</div>,
  Container: ({ children, ...props }) => <div data-testid="container" {...filterProps(props)}>{children}</div>,
  Heading: ({ children, ...props }) => <h1 data-testid="heading" {...filterProps(props)}>{children}</h1>,
  Flex: ({ children, ...props }) => <div data-testid="flex" {...filterProps(props)}>{children}</div>,
  Spinner: ({ ...props }) => <div data-testid="spinner" {...filterProps(props)}>Loading...</div>,
  Text: ({ children, ...props }) => <span data-testid="text" {...filterProps(props)}>{children}</span>,
  VStack: ({ children, ...props }) => <div data-testid="vstack" {...filterProps(props)}>{children}</div>,
  HStack: ({ children, ...props }) => <div data-testid="hstack" {...filterProps(props)}>{children}</div>,
  Badge: ({ children, ...props }) => <span data-testid="badge" {...filterProps(props)}>{children}</span>,
  Alert: ({ children, ...props }) => <div data-testid="alert" {...filterProps(props)}>{children}</div>,
  Button: ({ children, ...props }) => <button data-testid="button" {...filterProps(props)}>{children}</button>,
  Collapsible: ({ children, ...props }) => <div data-testid="collapsible" {...filterProps(props)}>{children}</div>,
  Tabs: {
    Root: ({ children, ...props }) => <div data-testid="tabs-root" {...filterProps(props)}>{children}</div>,
    List: ({ children, ...props }) => <div data-testid="tabs-list" role="tablist" {...filterProps(props)}>{children}</div>,
    Trigger: ({ children, value, ...props }) => <button data-testid="tab-trigger" role="tab" data-value={value} {...filterProps(props)}>{children}</button>,
    Content: ({ children, value, ...props }) => <div data-testid="tabs-content" data-value={value} {...filterProps(props)}>{children}</div>,
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