# Chakra UI v3 Development Guide

This file provides specific guidance for working with Chakra UI v3.x in this project. **IMPORTANT: Chakra UI v3 is NOT backward compatible with v2.x - always check the v3 documentation.**

## Current Version

This project uses Chakra UI v3.2.0. Always verify component APIs in the official v3 documentation.

## Key Breaking Changes from v2 to v3

### 1. Compound Component Pattern
Most components now use a compound pattern instead of single components:

```jsx
// ❌ v2 Pattern (DON'T USE)
<Switch isChecked={value} onChange={setValue} />

// ✅ v3 Pattern (CORRECT)
<Switch.Root checked={value} onCheckedChange={(details) => setValue(details.checked)}>
  <Switch.HiddenInput />
  <Switch.Control>
    <Switch.Thumb />
  </Switch.Control>
  <Switch.Label>Label text</Switch.Label>
</Switch.Root>
```

### 2. Event Handler Changes
Event handlers often receive objects instead of direct values:

```jsx
// ❌ v2: Direct value
onChange={(value) => setValue(value)}

// ✅ v3: Object with details
onCheckedChange={(details) => setValue(details.checked)}
onValueChange={(details) => setValue(details.value)}
```

### 3. Prop Name Changes
Many prop names have changed:

```jsx
// ❌ v2 Props
isChecked, isOpen, isDisabled, isInvalid

// ✅ v3 Props
checked, open, disabled, invalid
```

### 4. Color System Changes
Chakra UI v3 uses semantic color tokens instead of numbered scales:

```jsx
// ❌ v2 Color System (DON'T USE)
bg="gray.50"          // Light gray background
bg="gray.100"         // Slightly darker gray
color="gray.500"      // Medium gray text
color="gray.600"      // Darker gray text
color="blue.600"      // Blue text
bg="blue.50"          // Light blue background

// ✅ v3 Semantic Colors (CORRECT)
bg="bg.muted"         // Light background
bg="bg.subtle"        // Subtle background
color="fg.muted"      // Muted text
color="fg.default"    // Default text
color="blue.600"      // Blue text (some numbered colors still work)
bg="blue.subtle"      // Light blue background
bg="blue.muted"       // Muted blue background
borderColor="border.default"  // Default border color
```

**Common v3 semantic tokens:**
- `bg.default` - Default background
- `bg.muted` - Muted background  
- `bg.subtle` - Subtle background
- `fg.default` - Default text
- `fg.muted` - Muted text
- `border.default` - Default border
- `blue.subtle` - Light blue
- `blue.muted` - Muted blue
- `gray.subtle` - Light gray
- `gray.muted` - Muted gray

## Common Components Reference

### Switch
```jsx
<Switch.Root checked={value} onCheckedChange={(details) => setValue(details.checked)}>
  <Switch.HiddenInput />
  <Switch.Control>
    <Switch.Thumb />
  </Switch.Control>
  <Switch.Label>Switch Label</Switch.Label>
</Switch.Root>
```

### Select
```jsx
<Select.Root 
  value={selectedValue ? [selectedValue] : []}
  onValueChange={(details) => {
    // Note: onValueChange may not work reliably in Chakra UI v3
    // Use direct onClick on Select.Item as workaround
  }}
  positioning={{ 
    strategy: "absolute",
    placement: "bottom-start",
    flip: true,
    gutter: 4
  }}
>
  <Select.Trigger>
    {/* Use Text component for reliable value display */}
    <Text fontSize="sm" flex="1" textAlign="left">
      {selectedValue || "Select option"}
    </Text>
    <Select.Indicator />
  </Select.Trigger>
  <Select.Positioner>
    <Select.Content 
      zIndex={1000}
      bg="white"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      shadow="lg"
      maxH="200px"
      overflow="auto"
    >
      {options.map((option) => (
        <Select.Item 
          key={option.id} 
          item={option.id}
          value={option.id}
          onClick={() => setSelectedValue(option.id)}
        >
          <Select.ItemText>{option.label}</Select.ItemText>
          <Select.ItemIndicator />
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Positioner>
</Select.Root>
```

**Select Component Known Issues:**
- `onValueChange` may not trigger reliably in Chakra UI v3
- `Select.ValueText` doesn't display selected values consistently
- **Workarounds:**
  - Use `Text` component in trigger for value display
  - Use direct `onClick` on `Select.Item` for selection handling
  - Keep `value` prop for maintaining component state

### Button
```jsx
// Simple button
<Button variant="solid" size="md">Click me</Button>

// Button with active state
<Button data-active>Active Button</Button>
```

### Input with Field
```jsx
<Field.Root invalid={hasError}>
  <Field.Label>Email</Field.Label>
  <Input placeholder="Enter email" />
  <Field.ErrorText>This field is required</Field.ErrorText>
</Field.Root>
```

### Accordion
```jsx
<Accordion.Root>
  <Accordion.Item>
    <Accordion.ItemTrigger />
    <Accordion.ItemContent />
  </Accordion.Item>
</Accordion.Root>
```

### Modal/Dialog
```jsx
<Dialog.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
  <Dialog.Trigger asChild>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Backdrop />
  <Dialog.Positioner>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Title</Dialog.Title>
        <Dialog.CloseTrigger />
      </Dialog.Header>
      <Dialog.Body>Content</Dialog.Body>
    </Dialog.Content>
  </Dialog.Positioner>
</Dialog.Root>
```

## Development Guidelines

### 1. Always Check Documentation First
- **Before using any component**, check the official Chakra UI v3 documentation
- **Never assume** v2 patterns will work in v3
- Use the MCP Context7 tool to get up-to-date documentation
- **Use the Chakra UI MCP server** - This project has access to specialized Chakra UI MCP tools for getting component examples, props, themes, and migration guidance

### 2. Common Pitfalls to Avoid
- Don't use `isChecked`, use `checked`
- Don't use `onChange` for switches, use `onCheckedChange`
- Don't use single components like `<Switch />`, use compound patterns
- Don't assume event handlers receive direct values - they often receive objects

### 3. Testing Patterns
- Always test both states (on/off, open/closed, etc.)
- Check browser console for any React warnings about invalid props
- If you get "Element type is invalid" errors, check import paths and component names

### 4. Import Patterns
```jsx
// ✅ Correct v3 imports
import { Switch, Button, Field, Dialog } from '@chakra-ui/react'

// Use compound components
<Switch.Root>
<Field.Root>
<Dialog.Root>
```

### 5. Checkbox Component (Compound Pattern)
Checkbox follows the compound component pattern in v3:

```jsx
// ✅ v3: Checkbox compound component pattern
import { Checkbox } from '@chakra-ui/react'

// Basic checkbox
<Checkbox.Root
  checked={isChecked}
  onCheckedChange={(details) => setIsChecked(details.checked)}
>
  <Checkbox.HiddenInput />
  <Checkbox.Control />
  <Checkbox.Label>Check me</Checkbox.Label>
</Checkbox.Root>

// Checkbox with indeterminate state
<Checkbox.Root
  checked={isAllSelected}
  indeterminate={isIndeterminate}
  onCheckedChange={(details) => handleSelectAll(details.checked)}
>
  <Checkbox.HiddenInput />
  <Checkbox.Control />
</Checkbox.Root>

// ❌ Alternative: Native input (if compound pattern doesn't work)
<Box
  as="input"
  type="checkbox"
  checked={isChecked}
  onChange={(e) => setIsChecked(e.target.checked)}
  cursor="pointer"
/>
```

## Debugging Tips

1. **Invalid Element Type Errors**: Usually means wrong import or component name
2. **Props Not Working**: Check if prop names changed from v2 to v3
3. **Event Handlers Not Firing**: Check if handler expects an object instead of direct value
4. **Styling Issues**: v3 uses different CSS architecture - check if style props changed
5. **Missing Component**: If a component doesn't exist, use native HTML elements with `Box as="element"`

## Resources

- [Chakra UI v3 Migration Guide](https://v3.chakra-ui.com/docs/migration)
- [Chakra UI v3 Components](https://v3.chakra-ui.com/docs/components)
- Use MCP Context7 tool with library ID `/llmstxt/chakra-ui-llms-full.txt` for latest docs
- **Chakra UI MCP Server Tools:**
  - `mcp__chakra-ui__get_component_props` - Get component properties and configuration options
  - `mcp__chakra-ui__get_component_example` - Get practical implementation examples with code snippets
  - `mcp__chakra-ui__list_components` - List all available Chakra UI components
  - `mcp__chakra-ui__get_theme` - Retrieve theme specification (colors, fonts, textStyles)
  - `mcp__chakra-ui__customize_theme` - Setup custom theme tokens
  - `mcp__chakra-ui__v2_to_v3_code_review` - Get migration guidance for specific v2→v3 scenarios
  - `mcp__chakra-ui__installation` - Get setup instructions for different frameworks

## Data Fetching Architecture

### React Query Implementation
**IMPORTANT**: This project uses React Query (@tanstack/react-query) for all data fetching. Never use manual useEffect patterns for API calls.

```jsx
// ✅ Correct: Use React Query
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

// Simple data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['tmStats'],
  queryFn: () => fetchApi('/api/tm/stats'),
});

// Infinite scrolling with pagination
const {
  data: infiniteData,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['tmSearch', sourceLang, targetLang, filters],
  queryFn: async ({ pageParam = 1 }) => {
    const queryParams = new URLSearchParams({
      sourceLang,
      targetLang,
      page: pageParam.toString(),
      limit: '100',
      ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value.trim() !== ''))
    });
    return fetchApi(`/api/tm/search?${queryParams}`);
  },
  getNextPageParam: (lastPage, allPages) => {
    const hasMore = lastPage.data.length === parseInt(lastPage.limit);
    return hasMore ? allPages.length + 1 : undefined;
  },
  staleTime: 30000, // 30 seconds for search results
});

// Flatten infinite query data
const data = useMemo(() => {
  return infiniteData?.pages.flatMap(page => page.data) || [];
}, [infiniteData]);
```

### Query Key Patterns
Use consistent query keys that include all relevant parameters:

```jsx
// ✅ Good query keys - include all parameters that affect the data
queryKey: ['status']
queryKey: ['tmStats'] 
queryKey: ['info']
queryKey: ['tmSearch', sourceLang, targetLang, filters]

// ❌ Bad - missing parameters
queryKey: ['tmSearch'] // Missing language and filter context
```

### Configuration
React Query is configured globally in App.jsx:

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000,   // 10 minutes - cache retention
    },
  },
});
```

### Automatic Benefits
React Query provides automatic:
- **Request deduplication** - Multiple identical requests become one
- **Background refetching** - Data stays fresh without user seeing loading
- **Caching** - Data persists across navigation and component unmounting
- **Error handling** - Consistent error states across components
- **Loading states** - Built-in loading indicators

### Filter Integration
For filtered data (like search), include filters in query key:

```jsx
// ✅ Filters in query key trigger automatic refetch
const queryKey = useMemo(() => [
  'tmSearch', 
  sourceLang, 
  targetLang, 
  filters
], [sourceLang, targetLang, filters]);

// Debounced filter updates
const handleFilterChange = (column, value) => {
  const newFilters = { ...filters, [column]: value };
  setSelectedRows(new Set());
  
  clearTimeout(window.tmFilterTimeout);
  window.tmFilterTimeout = setTimeout(() => {
    setFilters(newFilters); // This triggers React Query refetch automatically
  }, 300);
};
```

### Legacy Patterns to Avoid
❌ **Don't use these patterns anymore:**

```jsx
// ❌ Manual useEffect data fetching
useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await fetchApi('/api/endpoint');
      setData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);

// ❌ Manual loading/error state management
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// ❌ Location-based API guards
if (location.pathname !== '/target-path') return;

// ❌ Manual AbortController management
const abortControllerRef = useRef(null);

// ❌ Manual fetch guards
const fetchedRef = useRef(false);
if (fetchedRef.current) return;
```

## Navigation Architecture

### React Router Implementation
**IMPORTANT**: This project uses pure React Router navigation. No tab systems or conditional rendering based on location.

```jsx
// ✅ Correct: Pure React Router structure
function MainLayout() {
  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header with navigation buttons */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200">
        <Container maxWidth="6xl" py={3}>
          <Flex align="center" justify="space-between">
            {/* Navigation Links */}
            <Flex align="center" gap={4}>
              <Box 
                cursor="pointer" 
                px={3} 
                py={1} 
                borderRadius="md"
                bg={isActiveRoute('/') ? "blue.100" : "transparent"}
                _hover={{ bg: isActiveRoute('/') ? "blue.100" : "gray.100" }}
                onClick={() => navigate('/')}
              >
                <Text fontSize="sm" fontWeight="medium">Home</Text>
              </Box>
              {/* More nav items... */}
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Route-based Content */}
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/status" element={<Status />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/tm" element={<TM />} />
          <Route path="/tm/:sourceLang/:targetLang" element={<TMDetail />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </Suspense>
    </Box>
  );
}

// App.jsx routing setup
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/*" element={<MainLayout />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
```

### Active Route Detection
Simple helper function for navigation state:

```jsx
// ✅ Clean active route detection
const isActiveRoute = (path) => {
  if (path === '/') return location.pathname === '/';
  return location.pathname.startsWith(path);
};
```

### Navigation Benefits
This architecture provides:
- **Route-based mounting** - Only current route component mounts
- **Proper lazy loading** - Components load only when visited
- **Clean URLs** - Standard web navigation patterns
- **Browser back/forward** - Natural browser behavior
- **SEO friendly** - Proper route-based structure

### Legacy Patterns to Avoid
❌ **Don't use these patterns anymore:**

```jsx
// ❌ Tab system with conditional rendering
<Tabs.Root value={activeTab} onValueChange={handleTabChange}>
  <Tabs.Content value="tm">
    {location.pathname.startsWith('/tm/') ? <TMDetail /> : <TM />}
  </Tabs.Content>
</Tabs.Root>

// ❌ Complex tab change handlers
const handleTabChange = (details) => {
  const value = typeof details === 'object' ? details.value : details;
  setActiveTab(value);
  if (value === 'home') {
    navigate('/');
  } else if (value === 'tm') {
    navigate('/tm');
  } else {
    navigate(`/${value}`);
  }
};

// ❌ Location-based conditional rendering
if (location.pathname === '/cart') {
  return <CartSpecialLayout />;
}

// ❌ Manual active tab state management
const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
```

## Session Storage for Cart Functionality
Store cart data grouped by keys for persistence across navigation:

```jsx
// ✅ Session storage cart pattern
const getCart = () => {
  const cartData = sessionStorage.getItem('cartKey');
  return cartData ? JSON.parse(cartData) : {};
};

const saveCart = (cart) => {
  sessionStorage.setItem('cartKey', JSON.stringify(cart));
};

const addToCart = (items, groupKey) => {
  const cart = getCart();
  if (!cart[groupKey]) cart[groupKey] = [];
  cart[groupKey].push(...items);
  saveCart(cart);
};
```

## Architecture Summary

This application now follows modern React best practices:

### Current Stack
- **React 19** with functional components and hooks
- **Chakra UI v3** with compound component patterns
- **React Router v6** for navigation (no tab system)
- **React Query** for all data fetching and caching
- **TypeScript** for type safety (where applicable)

### Key Architectural Decisions
1. **Pure React Router Navigation** - No mixing with tab systems
2. **React Query for All Data** - No manual useEffect data fetching
3. **Route-based Component Mounting** - Components only mount when visited
4. **Session Storage for Cart** - Persistent cart across navigation
5. **Compound Components** - Chakra UI v3 patterns throughout

### Performance Characteristics
- **Zero duplicate API calls** - React Query deduplication
- **Automatic caching** - Data persists across navigation
- **Route-based code splitting** - Only load what's needed
- **Background refetching** - Data stays fresh without user awareness
- **Memory efficient** - Unused components unmount properly

### Development Guidelines
1. **Always use React Query** for API calls
2. **Always use Chakra UI v3 patterns** (compound components)
3. **Never use manual useEffect** for data fetching
4. **Never mix tab systems** with React Router
5. **Always include relevant parameters** in query keys
6. **Use debouncing** for filter inputs (300ms)
7. **Handle both old and new data formats** for backward compatibility

## API Routes Documentation

The L10n Monster server provides RESTful API endpoints for managing translation projects. All routes are prefixed with `/api`.

### Route Structure

Routes are organized by functionality in separate files under `/server/routes/`:

```
/server/routes/
├── info.js          # System information endpoints
├── status.js        # Project status endpoints
├── sources.js       # Source content (channels, projects, resources)
├── tm.js           # Translation memory endpoints
├── providers.js     # Translation provider endpoints
└── dispatcher.js    # Job creation and management
```

### Available Endpoints

#### System Information
- **GET `/api/info`** - Returns system information including:
  - `version`: Server version
  - `providers`: Array of available provider IDs
  - `config`: System configuration

#### Project Status
- **GET `/api/status`** - Returns project status and statistics

#### Source Content
- **GET `/api/channel/:channelId`** - Returns channel metadata and active content statistics
  - **Response:** `{ ts: number, store: string, projects: [...] }`
- **GET `/api/channel/:channelId/:prj`** - Returns project table of contents
  - **Query Parameters:** `offset`, `limit` (pagination)
  - **Response:** Array of resource handles for the project
- **GET `/api/resource/:channelId?rid=<resourceId>`** - Returns resource details with segments
  - **Query Parameters:** `rid` (required) - Resource ID
  - **Response:** Resource handle with segments array

#### Translation Memory
- **GET `/api/tm/stats`** - Returns available language pairs (sorted array)
- **GET `/api/tm/stats/:sourceLang/:targetLang`** - Returns TM statistics for specific language pair
  - **Response:** Statistics object with counts, quality distribution, etc.
- **GET `/api/tm/lowCardinalityColumns/:sourceLang/:targetLang`** - Returns available filter options
  - **Response:** `{ channel: [...], translationProvider: [...], ... }`
- **GET `/api/tm/search`** - Search translation memory entries with advanced filtering
  - **Query Parameters:**
    - `sourceLang`, `targetLang` (required)
    - `page`, `limit` (pagination, default: page=1, limit=100)
    - `guid`, `nid`, `jobGuid`, `rid`, `sid`, `channel` (exact or partial match)
    - `nsrc`, `ntgt`, `notes`, `tconf` (text search - supports quoted exact match)
    - `q` (quality score filtering)
    - `translationProvider` (provider filtering)
    - `onlyTNotes` (boolean: "1" to show only TUs with translator notes)
    - `minTS`, `maxTS` (timestamp range filtering - milliseconds since epoch)
  - **Text Search:** Use quotes for exact match (e.g., `nsrc="hello world"`), otherwise partial match
  - **Date Range Filtering:** Filter by timestamp range using minTS and maxTS (milliseconds). UI displays clickable date range (M/D format without leading zeros, uses current year). Click to open popover with From/To date pickers and Apply/Clear buttons.
  - **Response:** `{ data: [...], page: number, limit: number }`
- **GET `/api/tm/job/:jobGuid`** - Returns job details by GUID
  - **Response:** Job object with metadata, TUs, timestamps, etc.

#### Translation Providers
- **GET `/api/providers`** - Returns detailed provider information (slower)
  - Use `/api/info` for just provider IDs (faster)

#### Job Management
- **POST `/api/dispatcher/createJobs`** - Create translation jobs
  - **Body:**
    ```json
    {
      "sourceLang": "en",
      "targetLang": "es", 
      "tus": [...],           // Array of translation units
      "providerList": [...]   // Array of provider IDs
    }
    ```
  - **Response:** Array of created job objects with properties like `jobGuid`, `tus`, `estimatedCost`, `translationProvider`
  - **Options:** Automatically applies `skipQualityCheck: true` and `skipGroupCheck: true`

- **POST `/api/dispatcher/startJobs`** - Start created jobs
  - **Body:**
    ```json
    {
      "jobs": [...],          // Array of job objects from createJobs
      "instructions": "..."   // Optional job-specific instructions
    }
    ```
  - **Response:** Array of job status objects: `{ sourceLang, targetLang, jobGuid, translationProvider, status }`

### Route Implementation Pattern

Each route file exports a setup function:

```javascript
// routes/example.js
import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupExampleRoutes(router, mm) {
    router.get('/example', async (req, res) => {
        logInfo`/example`;
        try {
            // Use MonsterManager (mm) to access core functionality
            const result = await mm.someMethod();
            logVerbose`Processed ${result.length} items`;
            res.json(result);
        } catch (error) {
            logInfo`Error: ${error.message}`;
            res.status(500).json({ error: error.message });
        }
    });
}
```

### Integration in main server (index.js):

```javascript
import { setupExampleRoutes } from './routes/example.js';

// In API setup
setupExampleRoutes(apiRouter, mm);
```

### Error Handling Standards

- **400**: Bad Request (missing/invalid parameters)
- **500**: Internal Server Error (caught exceptions)
- Always use try/catch blocks for async operations
- Log requests with `logInfo` and details with `logVerbose`
- Return JSON error objects: `{ error: "message", details?: "..." }`

### MonsterManager Access

Routes receive the MonsterManager instance (`mm`) which provides access to:
- `mm.tmm` - Translation Memory Manager
- `mm.dispatcher` - Job Dispatcher (`createJobs`, `startJobs`)
- `mm.rm` - Resource Manager
- `mm.ops` - Operations Manager
- `mm.currencyFormatter` - Currency formatting utility

### Job Workflow

The job management system follows a two-step process:

1. **Create Jobs** (`/api/dispatcher/createJobs`):
   - Takes TUs and provider list
   - Returns job objects with estimated costs and accepted TUs
   - Jobs are created but not yet started
   - Providers may accept some, all, or none of the submitted TUs

2. **Start Jobs** (`/api/dispatcher/startJobs`):
   - Takes job objects from step 1 and optional instructions
   - Actually initiates the translation process
   - Returns status information for tracking job progress

## Production Build Configuration

The Vite build is configured with a hybrid chunking strategy for optimal performance:

```javascript
// vite.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        // All node_modules in one vendor bundle
        if (id.includes('node_modules')) {
          return 'vendor';
        }
        // Bundle utility files with index instead of creating tiny chunks
        if (id.includes('/utils/') || id.includes('/src/components/')) {
          return 'index';
        }
        // Pages remain separate for lazy loading
      }
    }
  }
}
```

**Build Output:**
- **1 vendor bundle** (~725 KB / 210 KB gzipped) - All dependencies (React, Chakra UI, React Router, etc.)
- **1 index bundle** (~28 KB) - App core, utilities, and shared components
- **~11 page chunks** (1-17 KB each) - Individual pages for code splitting

**Benefits:**
- ✅ Vendor bundle rarely changes (excellent for caching)
- ✅ Pages lazy load independently for faster initial render
- ✅ Shared components bundled efficiently
- ✅ Fewer files than default Vite chunking (~16 vs ~40)

**Commands:**
```bash
npm run build    # Build production bundle
npm run preview  # Preview production build locally
```

## Remember

**When in doubt:**
1. **Check React Query docs** for data fetching patterns
2. **Check Chakra UI v3 docs** for component usage
3. **Use pure React Router** for navigation
4. **Never guess based on v2 Chakra UI knowledge**
5. **Use Chakra UI MCP tools** for accurate component examples and props