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
  delete domProps.borderTop;
  delete domProps.justifyContent;
  delete domProps.alignItems;
  delete domProps.align;
  delete domProps.justify;
  delete domProps.gap;
  delete domProps.px;
  delete domProps.py;
  delete domProps.pt;
  delete domProps.p;
  delete domProps.pl;
  delete domProps.mt;
  delete domProps.mb;
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
  delete domProps.rounded;
  delete domProps.height;
  delete domProps.width;
  delete domProps.position;
  delete domProps.top;
  delete domProps.left;
  delete domProps.transition;
  delete domProps.flex;
  delete domProps.asChild;
  delete domProps.textAlign;
  delete domProps.flexDirection;
  delete domProps.w;
  delete domProps.h;
  delete domProps.minW;
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
  Badge: ({ children, ...props }) => <span data-testid="badge" {...filterProps(props)}>{children}</span>,
  Collapsible: {
    Root: ({ children, open, ...props }) => <div data-testid="collapsible-root" data-open={open} {...filterProps(props)}>{children}</div>,
    Content: ({ children, ...props }) => <div data-testid="collapsible-content" {...filterProps(props)}>{children}</div>,
  },
  IconButton: ({ children, ...props }) => <button data-testid="icon-button" {...filterProps(props)}>{children}</button>,
  Table: {
    Root: ({ children, ...props }) => <table data-testid="table-root" {...filterProps(props)}>{children}</table>,
    Header: ({ children, ...props }) => <thead data-testid="table-header" {...filterProps(props)}>{children}</thead>,
    Body: ({ children, ...props }) => <tbody data-testid="table-body" {...filterProps(props)}>{children}</tbody>,
    Row: ({ children, ...props }) => <tr data-testid="table-row" {...filterProps(props)}>{children}</tr>,
    ColumnHeader: ({ children, ...props }) => <th data-testid="table-column-header" {...filterProps(props)}>{children}</th>,
    Cell: ({ children, ...props }) => <td data-testid="table-cell" {...filterProps(props)}>{children}</td>,
  },
  Link: ({ children, ...props }) => <a data-testid="link" {...filterProps(props)}>{children}</a>,
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
    translatedDetails: [
      { minQ: 1, q: 1, seg: 80, words: 800, chars: 4000, res: 5 }
    ],
    untranslatedDetails: {
      'null': [{ minQ: 1, seg: 20, words: 200, chars: 1000, res: 1 }]
    }
  };

  it('renders project name', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('displays untranslated badge when applicable', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('20 untranslated')).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders table with translated and untranslated section headers', () => {
    render(<ProjectCard project={mockProject} />);
    // Check for table structure
    expect(screen.getByTestId('table-root')).toBeInTheDocument();
    // Check for translated and untranslated section headers (title case)
    expect(screen.getByText('Translated')).toBeInTheDocument();
    expect(screen.getByText('Untranslated')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Min Q')).toBeInTheDocument();
    expect(screen.getByText('Res')).toBeInTheDocument();
    expect(screen.getByText('Strings')).toBeInTheDocument();
    expect(screen.getByText('Words')).toBeInTheDocument();
    expect(screen.getByText('Chars')).toBeInTheDocument();
  });

  it('shows chevron indicators for expandable sections', () => {
    render(<ProjectCard project={mockProject} />);
    // Check for chevron indicators (▶ when collapsed)
    const chevrons = screen.getAllByText('▶');
    expect(chevrons.length).toBeGreaterThan(0);
  });
});
