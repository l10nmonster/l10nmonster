import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectCard from './ProjectCard';

// Mock Chakra UI components
vi.mock('@chakra-ui/react', () => ({
  Card: {
    Root: ({ children, ...props }) => <div data-testid="card-root" {...props}>{children}</div>,
    Body: ({ children, ...props }) => <div data-testid="card-body" {...props}>{children}</div>,
  },
  Text: ({ children, ...props }) => <span data-testid="text" {...props}>{children}</span>,
  Box: ({ children, ...props }) => <div data-testid="box" {...props}>{children}</div>,
  Flex: ({ children, ...props }) => <div data-testid="flex" {...props}>{children}</div>,
}));

describe('ProjectCard', () => {
  const mockProject = {
    sourceLang: 'en',
    targetLang: 'fr',
    resCount: 10,
    segmentCount: 100,
    translationStatus: [
      { minQ: 1, q: 1, seg: 80, words: 800, chars: 4000 },
      { minQ: 1, q: null, seg: 20, words: 200, chars: 1000 }
    ]
  };

  it('renders project language pair', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('en → fr')).toBeInTheDocument();
  });

  it('displays resource and segment counts', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Resources: 10')).toBeInTheDocument();
    expect(screen.getByText('Segments: 100')).toBeInTheDocument();
  });

  it('shows untranslated warning when applicable', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Untranslated: 20 segments')).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
}); 