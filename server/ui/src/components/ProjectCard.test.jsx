import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectCard from './ProjectCard';

// Helper function to filter out Chakra UI props that are not valid DOM attributes
const filterProps = (props) => {
  const domProps = { ...props };
  // Remove Chakra UI-specific props that cause React warnings
  delete domProps.bg;
  delete domProps.minH;
  delete domProps.borderBottom;
  delete domProps.borderColor;
  delete domProps.borderRadius;
  delete domProps.borderWidth;
  delete domProps.justifyContent;
  delete domProps.alignItems;
  delete domProps.align;
  delete domProps.justify;
  delete domProps.gap;
  delete domProps.px;
  delete domProps.py;
  delete domProps.p;
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
  delete domProps.minW;
  delete domProps.flexWrap;
  delete domProps.zIndex;
  delete domProps.mb;
  delete domProps.rounded;
  delete domProps.height;
  delete domProps.width;
  delete domProps.position;
  delete domProps.top;
  delete domProps.left;
  delete domProps.transition;
  delete domProps.flex;
  delete domProps.asChild;
  return domProps;
};

// Mock Chakra UI components
vi.mock('@chakra-ui/react', () => ({
  Card: {
    Root: ({ children, ...props }) => <div data-testid="card-root" {...filterProps(props)}>{children}</div>,
    Body: ({ children, ...props }) => <div data-testid="card-body" {...filterProps(props)}>{children}</div>,
  },
  Text: ({ children, ...props }) => <span data-testid="text" {...filterProps(props)}>{children}</span>,
  Box: ({ children, ...props }) => <div data-testid="box" {...filterProps(props)}>{children}</div>,
  Flex: ({ children, ...props }) => <div data-testid="flex" {...filterProps(props)}>{children}</div>,
  Tooltip: {
    Root: ({ children, ...props }) => <div data-testid="tooltip-root" {...filterProps(props)}>{children}</div>,
    Trigger: ({ children, ...props }) => <div data-testid="tooltip-trigger" {...filterProps(props)}>{children}</div>,
    Positioner: ({ children, ...props }) => <div data-testid="tooltip-positioner" {...filterProps(props)}>{children}</div>,
    Content: ({ children, ...props }) => <div data-testid="tooltip-content" {...filterProps(props)}>{children}</div>,
    Arrow: ({ ...props }) => <div data-testid="tooltip-arrow" {...filterProps(props)} />,
  },
  Badge: ({ children, ...props }) => <span data-testid="badge" {...filterProps(props)}>{children}</span>,
}));

describe('ProjectCard', () => {
  const mockProject = {
    projectName: 'Test Project',
    pairSummary: {
      segs: 100,
      words: 1000, 
      chars: 5000
    },
    pairSummaryByStatus: {
      translated: 80,
      'in flight': 0,
      'low quality': 0,
      untranslated: 20
    },
    translationStatus: [
      { minQ: 1, q: 1, seg: 80, words: 800, chars: 4000 },
      { minQ: 1, q: null, seg: 20, words: 200, chars: 1000 }
    ]
  };

  it('renders project name', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('displays segment, word, and char counts', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Segments: 100')).toBeInTheDocument();
    expect(screen.getByText('Words: 1,000')).toBeInTheDocument();
    expect(screen.getByText('Chars: 5,000')).toBeInTheDocument();
  });

  it('shows untranslated badge when applicable', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Untranslated: 20')).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
}); 