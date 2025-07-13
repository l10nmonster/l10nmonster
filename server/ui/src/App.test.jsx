import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import App from './App';

// Test wrapper component
function TestWrapper({ children }) {
  return (
    <ChakraProvider value={defaultSystem}>
      {children}
    </ChakraProvider>
  );
}

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    expect(container).toBeTruthy();
  });

  it('renders the main layout structure', () => {
    render(<App />, { wrapper: TestWrapper });
    
    // Check if the main element exists
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });
}); 