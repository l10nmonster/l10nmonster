import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Text,
  Box,
  Spinner,
  Alert,
  VStack,
  Input,
  Badge,
  Button,
  Flex,
  HStack,
  Checkbox,
  Tooltip,
  Icon,
  Select,
  Link,
  Popover
} from '@chakra-ui/react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import { addTMTUsToCart } from '../utils/cartUtils.jsx';

// Helper function to flatten normalized source/target arrays
function flattenNormalizedSourceToOrdinal(nsrc) {
  if (!Array.isArray(nsrc)) return '';
  return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.t}}}`)).join('');
}

// Helper component to render filter input (select for low cardinality, input otherwise)
const FilterInput = ({ columnName, label, value, onChange, onFocus, onBlur, inputRef, lowCardinalityOptions, placeholder }) => {
  const hasLowCardinalityOptions = lowCardinalityOptions && lowCardinalityOptions.length > 0;

  if (hasLowCardinalityOptions) {
    return (
      <Select.Root
        value={value ? [value] : []}
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
        <Select.Trigger
          size="xs"
          bg="yellow.subtle"
          onFocus={onFocus}
          onBlur={onBlur}
          ref={inputRef}
        >
          <Text fontSize="xs" flex="1" textAlign="left" color={value ? "fg.default" : "fg.muted"}>
            {value || placeholder}
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
            {value && (
              <Select.Item
                item=""
                value=""
                onClick={() => onChange("")}
              >
                <Select.ItemText>---</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            )}
            {lowCardinalityOptions
              .slice()
              .sort((a, b) => a.localeCompare(b))
              .map((option) => (
                <Select.Item
                  key={option}
                  item={option}
                  value={option}
                  onClick={() => onChange(option)}
                >
                  <Select.ItemText>{option}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    );
  }

  return (
    <Input
      size="xs"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      ref={inputRef}
      bg="yellow.subtle"
    />
  );
};

const TMDetail = () => {
  const { sourceLang, targetLang } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState(() => ({
    guid: searchParams.get('guid') || '',
    nid: searchParams.get('nid') || '',
    rid: searchParams.get('rid') || '',
    sid: searchParams.get('sid') || '',
    nsrc: searchParams.get('nsrc') || '',
    ntgt: searchParams.get('ntgt') || '',
    tconf: searchParams.get('tconf') || '',
    q: searchParams.get('q') || '',
    translationProvider: searchParams.get('translationProvider') || '',
    jobGuid: searchParams.get('jobGuid') || '',
    channel: searchParams.get('channel') || '',
    minTS: searchParams.get('minTS') || '',
    maxTS: searchParams.get('maxTS') || ''
  }));
  
  const [showOnlyActive, setShowOnlyActive] = useState(() => {
    const activeParam = searchParams.get('active');
    return activeParam !== null ? activeParam === '1' : true; // Default to true if not in URL
  });

  const [showTechnicalColumns, setShowTechnicalColumns] = useState(() => {
    return searchParams.get('showTechnicalColumns') === '1';
  });
  const [showTNotes, setShowTNotes] = useState(() => {
    return searchParams.get('showTNotes') === '1';
  });
  const [showOnlyLeveraged, setShowOnlyLeveraged] = useState(() => {
    return searchParams.get('showOnlyLeveraged') === '1';
  });
  
  // Separate state for input values to prevent focus loss
  const [inputValues, setInputValues] = useState(() => ({
    guid: searchParams.get('guid') || '',
    nid: searchParams.get('nid') || '',
    rid: searchParams.get('rid') || '',
    sid: searchParams.get('sid') || '',
    nsrc: searchParams.get('nsrc') || '',
    ntgt: searchParams.get('ntgt') || '',
    tconf: searchParams.get('tconf') || '',
    q: searchParams.get('q') || '',
    translationProvider: searchParams.get('translationProvider') || '',
    jobGuid: searchParams.get('jobGuid') || '',
    channel: searchParams.get('channel') || '',
    minTS: searchParams.get('minTS') || '',
    maxTS: searchParams.get('maxTS') || ''
  }));

  const observerRef = useRef();
  const timeoutRef = useRef();
  const urlTimeoutRef = useRef();
  const focusedInputRef = useRef(null);
  const inputRefs = useRef({});

  // Temporary date range state for popover
  const [tempMinTS, setTempMinTS] = useState('');
  const [tempMaxTS, setTempMaxTS] = useState('');
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  
  // Create query key that includes filters for automatic refetching when filters change
  const queryKey = useMemo(() => [
    'tmSearch',
    sourceLang,
    targetLang,
    filters,
    showOnlyActive,
    showTNotes,
    showOnlyLeveraged
  ], [sourceLang, targetLang, filters, showOnlyActive, showTNotes, showOnlyLeveraged]);

  const {
    data: infiniteData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams({
        sourceLang,
        targetLang,
        page: pageParam.toString(),
        limit: '100',
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value.trim() !== '')),
        ...(showOnlyActive && { active: '1' }),
        ...(showTNotes && { onlyTNotes: '1' })
      });

      // Add timestamp filters if they exist
      // Format: M/D or MM/DD (uses current year)
      if (filters.minTS && /^\d{1,2}\/\d{1,2}$/.test(filters.minTS)) {
        const currentYear = new Date().getFullYear();
        const [month, day] = filters.minTS.split('/');
        const minDate = new Date(`${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
        queryParams.set('minTS', minDate.getTime().toString());
      }
      if (filters.maxTS && /^\d{1,2}\/\d{1,2}$/.test(filters.maxTS)) {
        const currentYear = new Date().getFullYear();
        const [month, day] = filters.maxTS.split('/');
        const maxDate = new Date(`${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59.999`);
        queryParams.set('maxTS', maxDate.getTime().toString());
      }

      const response = await fetchApi(`/api/tm/search?${queryParams}`);
      return response;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got exactly the limit, there might be more pages
      const hasMore = lastPage.data.length === parseInt(lastPage.limit);
      return hasMore ? allPages.length + 1 : undefined;
    },
    staleTime: 30000, // 30 seconds - shorter for search results
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });

  // Query for low cardinality columns
  const { data: lowCardinalityColumns = {} } = useQuery({
    queryKey: ['lowCardinalityColumns', sourceLang, targetLang],
    queryFn: () => fetchApi(`/api/tm/lowCardinalityColumns/${sourceLang}/${targetLang}`),
    staleTime: 5 * 60 * 1000, // 5 minutes - these don't change often
  });

  // Flatten all pages into a single array and apply client-side filtering
  const data = useMemo(() => {
    let allData = infiniteData?.pages.flatMap(page => page.data) || [];

    // Apply "Only Leveraged" filter (hide entries with null channel)
    if (showOnlyLeveraged) {
      allData = allData.filter(item => item.channel !== null && item.channel !== undefined && item.channel !== '');
    }

    return allData;
  }, [infiniteData, showOnlyLeveraged]);

  const triggerElementRef = useCallback(node => {
    if (isLoading || isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleInputFocus = useCallback((column) => {
    focusedInputRef.current = column;
  }, []);

  const handleInputBlur = useCallback(() => {
    focusedInputRef.current = null;
  }, []);

  // Function to update URL parameters
  const updateUrlParams = useCallback((newFilters, newShowOnlyActive, newShowTechnicalColumns, newShowTNotes, newShowOnlyLeveraged) => {
    const params = new URLSearchParams();

    // Add non-empty filters to URL
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value.trim() !== '') {
        params.set(key, value);
      }
    });

    // Add active filter if not default (true)
    if (!newShowOnlyActive) {
      params.set('active', '0');
    } else if (Object.keys(Object.fromEntries(params)).length > 0) {
      // Only add active=1 if there are other parameters
      params.set('active', '1');
    }

    // Add checkbox filters if they are true
    if (newShowTechnicalColumns) {
      params.set('showTechnicalColumns', '1');
    }
    if (newShowTNotes) {
      params.set('showTNotes', '1');
    }
    if (newShowOnlyLeveraged) {
      params.set('showOnlyLeveraged', '1');
    }

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleFilterChange = useCallback((column, value) => {
    // Update input values immediately to prevent focus loss
    setInputValues(prev => ({ ...prev, [column]: value }));
    
    // Clear selection when filtering
    setSelectedRows(new Set());
    
    // Debounce the filter update for API calls
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const newFilters = { ...filters, [column]: value };
      setFilters(newFilters);
      
      // Debounce URL updates separately (200ms)
      clearTimeout(urlTimeoutRef.current);
      urlTimeoutRef.current = setTimeout(() => {
        updateUrlParams(newFilters, showOnlyActive, showTechnicalColumns, showTNotes, showOnlyLeveraged);
      }, 200);
    }, 300);
  }, [filters, showOnlyActive, showTechnicalColumns, showTNotes, showOnlyLeveraged, updateUrlParams]);

  const handleRowSelect = (rowIndex, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIndices = new Set(data.map((_, index) => index));
      setSelectedRows(allIndices);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleAddToCart = () => {
    const selectedData = Array.from(selectedRows).map(index => data[index]);
    addTMTUsToCart(sourceLang, targetLang, selectedData);
    setSelectedRows(new Set()); // Clear selection after adding to cart
  };

  const isAllSelected = data.length > 0 && selectedRows.size === data.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length;

  // Restore focus after data updates
  useEffect(() => {
    if (focusedInputRef.current && inputRefs.current[focusedInputRef.current]) {
      const inputElement = inputRefs.current[focusedInputRef.current];
      setTimeout(() => {
        if (inputElement && document.contains(inputElement)) {
          inputElement.focus();
          // Restore cursor position to end (only for input elements that support selection)
          if (typeof inputElement.setSelectionRange === 'function' && inputElement.value) {
            const length = inputElement.value.length;
            inputElement.setSelectionRange(length, length);
          }
        }
      }, 10);
    }
  }, [data]); // Re-run when data changes (after table refresh)

  // Handle showOnlyActive changes
  const handleShowOnlyActiveChange = useCallback((checked) => {
    setShowOnlyActive(checked);
    // Update URL immediately for checkbox changes
    updateUrlParams(filters, checked, showTechnicalColumns, showTNotes, showOnlyLeveraged);
  }, [filters, showTechnicalColumns, showTNotes, showOnlyLeveraged, updateUrlParams]);

  // Handle showTNotes changes
  const handleShowTNotesChange = useCallback((checked) => {
    setShowTNotes(checked);
    // Clear selection when filtering
    setSelectedRows(new Set());
    // Update URL immediately for checkbox changes
    updateUrlParams(filters, showOnlyActive, showTechnicalColumns, checked, showOnlyLeveraged);
  }, [filters, showOnlyActive, showTechnicalColumns, showOnlyLeveraged, updateUrlParams]);

  // Handle showOnlyLeveraged changes
  const handleShowOnlyLeveragedChange = useCallback((checked) => {
    setShowOnlyLeveraged(checked);
    // Clear selection when filtering
    setSelectedRows(new Set());
    // Update URL immediately for checkbox changes
    updateUrlParams(filters, showOnlyActive, showTechnicalColumns, showTNotes, checked);
  }, [filters, showOnlyActive, showTechnicalColumns, showTNotes, updateUrlParams]);

  // Handle showTechnicalColumns changes
  const handleShowTechnicalColumnsChange = useCallback((checked) => {
    setShowTechnicalColumns(checked);
    // Update URL immediately for checkbox changes
    updateUrlParams(filters, showOnlyActive, checked, showTNotes, showOnlyLeveraged);
  }, [filters, showOnlyActive, showTNotes, showOnlyLeveraged, updateUrlParams]);

  // Cleanup filter timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (urlTimeoutRef.current) {
        clearTimeout(urlTimeoutRef.current);
      }
    };
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };


  // Only show full-page spinner on initial load, not during filter updates
  if (isLoading && data.length === 0 && !infiniteData) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box mt={5} px={6}>
        <Alert status="error">
          <Box>
            <Text fontWeight="bold">Error</Text>
            <Text>{error?.message || 'Failed to fetch translation memory data'}</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Add to Cart Button */}
      <Box 
        bg="blue.subtle" 
        borderBottom="1px" 
        borderColor="blue.muted" 
        shadow="md"
        borderLeft="4px"
        borderLeftColor="blue.500"
        px={6} 
        py={4}
        mb={6}
      >
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={3}>
            <Text fontSize="md" fontWeight="semibold" color="blue.700">
              {sourceLang} → {targetLang}
            </Text>
            {isLoading && (
              <Spinner size="sm" />
            )}
          </Flex>
          <Flex align="center" gap={3}>
            <Flex align="center" gap={2}>
              <Text fontSize="sm" color="blue.600">Show Technical IDs</Text>
              <Checkbox.Root
                checked={showTechnicalColumns}
                onCheckedChange={(details) => handleShowTechnicalColumnsChange(details.checked)}
                size="sm"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Flex>
            <Flex align="center" gap={2}>
              <Text fontSize="sm" color="blue.600">Only Leveraged</Text>
              <Checkbox.Root
                checked={showOnlyLeveraged}
                onCheckedChange={(details) => handleShowOnlyLeveragedChange(details.checked)}
                size="sm"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Flex>
            <Flex align="center" gap={2}>
              <Text fontSize="sm" color="blue.600">Only TNotes</Text>
              <Checkbox.Root
                checked={showTNotes}
                onCheckedChange={(details) => handleShowTNotesChange(details.checked)}
                size="sm"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Flex>
            {selectedRows.size > 0 && (
              <Button
                colorPalette="blue"
                onClick={handleAddToCart}
              >
                Add to Cart ({selectedRows.size} {selectedRows.size === 1 ? 'TU' : 'TUs'})
              </Button>
            )}
          </Flex>
        </Flex>
      </Box>

      {/* Table Container */}
      <Box 
        mx={6}
        h="calc(100vh - 180px)"
        bg="white" 
        borderRadius="lg" 
        shadow="sm" 
        overflow="auto"
      >
        <Box as="table" w="100%" fontSize="sm">
            <Box
              as="thead"
              position="sticky"
              top={0}
              bg="blue.subtle"
              zIndex={1}
              borderBottom="2px"
              borderColor="blue.muted"
              shadow="sm"
            >
              <Box as="tr">
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="60px" textAlign="center">
                  <Checkbox.Root
                    checked={isAllSelected}
                    onCheckedChange={(details) => handleSelectAll(details.checked)}
                  >
                    <Checkbox.HiddenInput ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }} />
                    <Checkbox.Control />
                  </Checkbox.Root>
                </Box>
                {showTechnicalColumns && (
                  <>
                    <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                      <VStack gap={2} align="stretch">
                        <Text fontSize="sm" fontWeight="bold" color="blue.600">guid</Text>
                        <Input
                          size="xs"
                          placeholder="Filter GUID..."
                          value={inputValues.guid}
                          onChange={(e) => handleFilterChange('guid', e.target.value)}
                          onFocus={() => handleInputFocus('guid')}
                          onBlur={handleInputBlur}
                          ref={(el) => { if (el) inputRefs.current.guid = el; }}
                          bg="yellow.subtle"
                          key="guid-input"
                        />
                      </VStack>
                    </Box>
                    <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                      <VStack gap={2} align="stretch">
                        <Text fontSize="sm" fontWeight="bold" color="blue.600">nid</Text>
                        <Input
                          size="xs"
                          placeholder="Filter NID..."
                          value={inputValues.nid}
                          onChange={(e) => handleFilterChange('nid', e.target.value)}
                          onFocus={() => handleInputFocus('nid')}
                          onBlur={handleInputBlur}
                          ref={(el) => { if (el) inputRefs.current.nid = el; }}
                          bg="yellow.subtle"
                          key="nid-input"
                        />
                      </VStack>
                    </Box>
                    <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                      <VStack gap={2} align="stretch">
                        <Text fontSize="sm" fontWeight="bold" color="blue.600">jobGuid</Text>
                        <Input
                          size="xs"
                          placeholder="Filter Job GUID..."
                          value={inputValues.jobGuid}
                          onChange={(e) => handleFilterChange('jobGuid', e.target.value)}
                          onFocus={() => handleInputFocus('jobGuid')}
                          onBlur={handleInputBlur}
                          ref={(el) => { if (el) inputRefs.current.jobGuid = el; }}
                          bg="yellow.subtle"
                          key="jobGuid-input"
                        />
                      </VStack>
                    </Box>
                    <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="150px" textAlign="left">
                      <VStack gap={2} align="stretch">
                        <Text fontSize="sm" fontWeight="bold" color="blue.600">rid</Text>
                        <Input
                          size="xs"
                          placeholder="Filter RID..."
                          value={inputValues.rid}
                          onChange={(e) => handleFilterChange('rid', e.target.value)}
                          onFocus={() => handleInputFocus('rid')}
                          onBlur={handleInputBlur}
                          ref={(el) => { if (el) inputRefs.current.rid = el; }}
                          bg="yellow.subtle"
                          key="rid-input"
                        />
                      </VStack>
                    </Box>
                    <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="150px" textAlign="left">
                      <VStack gap={2} align="stretch">
                        <Text fontSize="sm" fontWeight="bold" color="blue.600">sid</Text>
                        <Input
                          size="xs"
                          placeholder="Filter SID..."
                          value={inputValues.sid}
                          onChange={(e) => handleFilterChange('sid', e.target.value)}
                          onFocus={() => handleInputFocus('sid')}
                          onBlur={handleInputBlur}
                          ref={(el) => { if (el) inputRefs.current.sid = el; }}
                          bg="yellow.subtle"
                          key="sid-input"
                        />
                      </VStack>
                    </Box>
                  </>
                )}
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">Channel</Text>
                    <FilterInput
                      columnName="channel"
                      label="Channel"
                      value={inputValues.channel}
                      onChange={(value) => handleFilterChange('channel', value)}
                      onFocus={() => handleInputFocus('channel')}
                      onBlur={handleInputBlur}
                      inputRef={(el) => { if (el) inputRefs.current.channel = el; }}
                      lowCardinalityOptions={lowCardinalityColumns.channel}
                      placeholder="Channel..."
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="350px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="blue.600"
                      textAlign={sourceLang?.startsWith('he') || sourceLang?.startsWith('ar') ? 'right' : 'left'}
                    >
                      Source
                    </Text>
                    <Input
                      size="xs"
                      placeholder="Filter source..."
                      value={inputValues.nsrc}
                      onChange={(e) => handleFilterChange('nsrc', e.target.value)}
                      onFocus={() => handleInputFocus('nsrc')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.nsrc = el; }}
                      bg="yellow.subtle"
                      key="nsrc-input"
                      dir={sourceLang?.startsWith('he') || sourceLang?.startsWith('ar') ? 'rtl' : 'ltr'}
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="350px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="blue.600"
                      textAlign={targetLang?.startsWith('he') || targetLang?.startsWith('ar') ? 'right' : 'left'}
                    >
                      Target
                    </Text>
                    <Input
                      size="xs"
                      placeholder="Filter target..."
                      value={inputValues.ntgt}
                      onChange={(e) => handleFilterChange('ntgt', e.target.value)}
                      onFocus={() => handleInputFocus('ntgt')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.ntgt = el; }}
                      bg="yellow.subtle"
                      key="ntgt-input"
                      dir={targetLang?.startsWith('he') || targetLang?.startsWith('ar') ? 'rtl' : 'ltr'}
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="60px" textAlign="center">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">TConf</Text>
                    <FilterInput
                      columnName="tconf"
                      label="TConf"
                      value={inputValues.tconf}
                      onChange={(value) => handleFilterChange('tconf', value)}
                      onFocus={() => handleInputFocus('tconf')}
                      onBlur={handleInputBlur}
                      inputRef={(el) => { if (el) inputRefs.current.tconf = el; }}
                      lowCardinalityOptions={lowCardinalityColumns.tconf}
                      placeholder="TConf..."
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="40px" textAlign="center">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">q</Text>
                    <FilterInput
                      columnName="q"
                      label="Quality"
                      value={inputValues.q}
                      onChange={(value) => handleFilterChange('q', value)}
                      onFocus={() => handleInputFocus('q')}
                      onBlur={handleInputBlur}
                      inputRef={(el) => { if (el) inputRefs.current.q = el; }}
                      lowCardinalityOptions={lowCardinalityColumns.q}
                      placeholder="Quality..."
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">Provider</Text>
                    <FilterInput
                      columnName="translationProvider"
                      label="Provider"
                      value={inputValues.translationProvider}
                      onChange={(value) => handleFilterChange('translationProvider', value)}
                      onFocus={() => handleInputFocus('translationProvider')}
                      onBlur={handleInputBlur}
                      inputRef={(el) => { if (el) inputRefs.current.translationProvider = el; }}
                      lowCardinalityOptions={lowCardinalityColumns.translationProvider}
                      placeholder="Provider..."
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="80px" textAlign="center">
                  <VStack gap={2} align="center">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">Active</Text>
                    <Checkbox.Root
                      checked={showOnlyActive}
                      onCheckedChange={(details) => handleShowOnlyActiveChange(details.checked)}
                      size="sm"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="center">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">Timestamp</Text>
                    <Popover.Root
                      open={isDatePopoverOpen}
                      onOpenChange={(details) => {
                        setIsDatePopoverOpen(details.open);
                        if (details.open) {
                          // Initialize temp values when opening
                          setTempMinTS(inputValues.minTS);
                          setTempMaxTS(inputValues.maxTS);
                        }
                      }}
                    >
                      <Popover.Trigger asChild>
                        <Text
                          fontSize="xs"
                          cursor="pointer"
                          color="blue.600"
                          textDecoration="underline"
                          _hover={{ color: "blue.700" }}
                          px={2}
                          py={1}
                        >
                          {inputValues.minTS || inputValues.maxTS
                            ? `${inputValues.minTS || 'start'} → ${inputValues.maxTS || 'end'}`
                            : 'Filter dates...'}
                        </Text>
                      </Popover.Trigger>
                      <Popover.Positioner>
                        <Popover.Content>
                          <Popover.Arrow />
                          <Popover.Header>
                            <Text fontSize="sm" fontWeight="semibold">Date Range Filter</Text>
                          </Popover.Header>
                          <Popover.Body>
                            <VStack gap={3} align="stretch">
                              <Box>
                                <Text fontSize="xs" mb={1} color="fg.muted">From</Text>
                                <Input
                                  type="date"
                                  size="sm"
                                  value={tempMinTS ? (() => {
                                    const [month, day] = tempMinTS.split('/');
                                    return `${new Date().getFullYear()}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`;
                                  })() : ''}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const [_, month, day] = e.target.value.split('-');
                                      setTempMinTS(`${parseInt(month, 10)}/${parseInt(day, 10)}`);
                                      // Force close picker in Safari
                                      setTimeout(() => e.target.blur(), 0);
                                    } else {
                                      setTempMinTS('');
                                    }
                                  }}
                                />
                              </Box>
                              <Box>
                                <Text fontSize="xs" mb={1} color="fg.muted">To</Text>
                                <Input
                                  type="date"
                                  size="sm"
                                  value={tempMaxTS ? (() => {
                                    const [month, day] = tempMaxTS.split('/');
                                    return `${new Date().getFullYear()}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`;
                                  })() : ''}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const [_, month, day] = e.target.value.split('-');
                                      setTempMaxTS(`${parseInt(month, 10)}/${parseInt(day, 10)}`);
                                      // Force close picker in Safari
                                      setTimeout(() => e.target.blur(), 0);
                                    } else {
                                      setTempMaxTS('');
                                    }
                                  }}
                                />
                              </Box>
                              <HStack gap={2}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  flex={1}
                                  onClick={() => {
                                    // Clear both date filters
                                    setInputValues(prev => ({ ...prev, minTS: '', maxTS: '' }));
                                    setSelectedRows(new Set());

                                    clearTimeout(timeoutRef.current);
                                    timeoutRef.current = setTimeout(() => {
                                      const newFilters = { ...filters, minTS: '', maxTS: '' };
                                      setFilters(newFilters);

                                      clearTimeout(urlTimeoutRef.current);
                                      urlTimeoutRef.current = setTimeout(() => {
                                        updateUrlParams(newFilters, showOnlyActive, showTechnicalColumns, showTNotes, showOnlyLeveraged);
                                      }, 200);
                                    }, 300);

                                    setTempMinTS('');
                                    setTempMaxTS('');
                                    setIsDatePopoverOpen(false);
                                  }}
                                >
                                  Clear
                                </Button>
                                <Button
                                  size="sm"
                                  colorPalette="blue"
                                  flex={1}
                                  onClick={() => {
                                    // Apply both date filters at once
                                    setInputValues(prev => ({ ...prev, minTS: tempMinTS, maxTS: tempMaxTS }));
                                    setSelectedRows(new Set());

                                    clearTimeout(timeoutRef.current);
                                    timeoutRef.current = setTimeout(() => {
                                      const newFilters = { ...filters, minTS: tempMinTS, maxTS: tempMaxTS };
                                      setFilters(newFilters);

                                      clearTimeout(urlTimeoutRef.current);
                                      urlTimeoutRef.current = setTimeout(() => {
                                        updateUrlParams(newFilters, showOnlyActive, showTechnicalColumns, showTNotes, showOnlyLeveraged);
                                      }, 200);
                                    }, 300);

                                    setIsDatePopoverOpen(false);
                                  }}
                                >
                                  Apply
                                </Button>
                              </HStack>
                            </VStack>
                          </Popover.Body>
                        </Popover.Content>
                      </Popover.Positioner>
                    </Popover.Root>
                  </VStack>
                </Box>
              </Box>
            </Box>
            <Box as="tbody">
              {data.map((item, index) => (
                <Box
                  as="tr"
                  key={`${index}-${item.guid || item.nid || index}`}
                  ref={index === data.length - 20 ? triggerElementRef : null}
                  _hover={{ bg: "gray.subtle" }}
                >
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                    <Checkbox.Root
                      checked={selectedRows.has(index)}
                      onCheckedChange={(details) => handleRowSelect(index, details.checked)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Box>
                  {showTechnicalColumns && (
                    <>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          color="blue.600"
                          userSelect="all"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          maxW="100px"
                        >
                          {item.guid}
                        </Text>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          color="purple.600"
                          userSelect="all"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          maxW="100px"
                        >
                          {item.nid || ''}
                        </Text>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          color="green.600"
                          userSelect="all"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          maxW="100px"
                          cursor="pointer"
                          _hover={{ textDecoration: "underline" }}
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(`/job/${item.jobGuid}`, '_blank');
                          }}
                        >
                          {item.jobGuid}
                        </Text>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text fontSize="xs" wordBreak="break-all" whiteSpace="normal">{item.rid}</Text>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text fontSize="xs" wordBreak="break-all" whiteSpace="normal">{item.sid}</Text>
                      </Box>
                    </>
                  )}
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    {item.channel ? (
                      <Link
                        as={RouterLink}
                        to={`/sources/${item.channel}?rid=${encodeURIComponent(item.rid)}&guid=${encodeURIComponent(item.guid)}`}
                        fontSize="xs"
                        color="blue.600"
                        _hover={{ textDecoration: "underline" }}
                      >
                        {item.channel}
                      </Link>
                    ) : (
                      <Text fontSize="xs">{item.channel}</Text>
                    )}
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    {item.notes ? (
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Text fontSize="xs" noOfLines={2} cursor="help" dir={sourceLang?.startsWith('he') || sourceLang?.startsWith('ar') ? 'rtl' : 'ltr'}>
                            {flattenNormalizedSourceToOrdinal(item.nsrc)}
                          </Text>
                        </Tooltip.Trigger>
                        <Tooltip.Positioner>
                          <Tooltip.Content maxW="400px" bg="yellow.100" borderWidth="1px" borderColor="yellow.300" shadow="lg">
                            <Tooltip.Arrow />
                            <Box>
                              {item.notes.desc && (
                                <Text fontSize="sm" mb={2} whiteSpace="pre-wrap" color="black">
                                  {item.notes.desc}
                                </Text>
                              )}
                              {item.notes.ph && (
                                <Box>
                                  <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                                    Placeholders:
                                  </Text>
                                  {Object.entries(item.notes.ph).map(([placeholder, info]) => (
                                    <Box key={placeholder} mb={1}>
                                      <Text fontSize="xs" fontFamily="mono" color="blue.600">
                                        {placeholder}
                                      </Text>
                                      <Text fontSize="xs" color="gray.600">
                                        {info.desc} (e.g., {info.sample})
                                      </Text>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          </Tooltip.Content>
                        </Tooltip.Positioner>
                      </Tooltip.Root>
                    ) : (
                      <Text fontSize="xs" noOfLines={2} dir={sourceLang?.startsWith('he') || sourceLang?.startsWith('ar') ? 'rtl' : 'ltr'}>
                        {flattenNormalizedSourceToOrdinal(item.nsrc)}
                      </Text>
                    )}
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Text fontSize="xs" noOfLines={2} dir={targetLang?.startsWith('he') || targetLang?.startsWith('ar') ? 'rtl' : 'ltr'}>
                      {flattenNormalizedSourceToOrdinal(item.ntgt)}
                    </Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                    {item.tnotes ? (
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Text
                            fontSize="xs"
                            fontWeight="bold"
                            cursor="help"
                          >
                            {item.tconf || ''}
                          </Text>
                        </Tooltip.Trigger>
                        <Tooltip.Positioner>
                          <Tooltip.Content maxW="400px" bg="yellow.100" borderWidth="1px" borderColor="yellow.300" shadow="lg">
                            <Tooltip.Arrow />
                            <Text fontSize="sm" whiteSpace="pre-wrap" color="black">
                              {item.tnotes}
                            </Text>
                          </Tooltip.Content>
                        </Tooltip.Positioner>
                      </Tooltip.Root>
                    ) : (
                      <Text fontSize="xs">
                        {item.tconf || ''}
                      </Text>
                    )}
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                    <Text fontSize="xs">
                      {item.q}
                    </Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Text fontSize="xs">{item.translationProvider}</Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                    {item.active === 1 && (
                      <Text fontSize="lg" color="green.500">
                        ✓
                      </Text>
                    )}
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                    <Text fontSize="xs" color="fg.muted">
                      {item.ts ? new Date(item.ts).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : ''}
                    </Text>
                  </Box>
                </Box>
              ))}
          </Box>
        </Box>
        
        {isFetchingNextPage && (
          <Flex justify="center" p={4}>
            <Spinner size="md" />
          </Flex>
        )}
        
        {!hasNextPage && data.length > 0 && (
          <Flex justify="center" p={4}>
            <Text color="fg.muted" fontSize="sm">
              No more results
            </Text>
          </Flex>
        )}
        
        {data.length === 0 && !isLoading && (
          <Flex justify="center" p={8}>
            <Text color="fg.muted">
              No translation units found for the current filters
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
};

export default TMDetail;