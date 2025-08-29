import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Tooltip
} from '@chakra-ui/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';

// Helper function to flatten normalized source/target arrays
function flattenNormalizedSourceToOrdinal(nsrc) {
  return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.t}}}`)).join('');
}

// Helper function to format timestamp from milliseconds to locale date
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const TMDetail = () => {
  const { sourceLang, targetLang } = useParams();
  const navigate = useNavigate();
  
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    guid: '',
    rid: '',
    sid: '',
    nsrc: '',
    ntgt: '',
    q: '',
    translationProvider: '',
    ts: '',
    jobGuid: ''
  });
  
  // Separate state for input values to prevent focus loss
  const [inputValues, setInputValues] = useState({
    guid: '',
    rid: '',
    sid: '',
    nsrc: '',
    ntgt: '',
    q: '',
    translationProvider: '',
    ts: '',
    jobGuid: ''
  });

  const observerRef = useRef();
  const timeoutRef = useRef();
  const focusedInputRef = useRef(null);
  const inputRefs = useRef({});
  
  // Create query key that includes filters for automatic refetching when filters change
  const queryKey = useMemo(() => [
    'tmSearch', 
    sourceLang, 
    targetLang, 
    filters
  ], [sourceLang, targetLang, filters]);

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
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value.trim() !== ''))
      });
      
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

  // Flatten all pages into a single array
  const data = useMemo(() => {
    return infiniteData?.pages.flatMap(page => page.data) || [];
  }, [infiniteData]);

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

  const handleFilterChange = useCallback((column, value) => {
    // Update input values immediately to prevent focus loss
    setInputValues(prev => ({ ...prev, [column]: value }));
    
    // Clear selection when filtering
    setSelectedRows(new Set());
    
    // Debounce the filter update for API calls
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, [column]: value })); // This will trigger React Query to refetch automatically
    }, 300);
  }, []);

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

  const getCart = () => {
    const cartData = sessionStorage.getItem('tmCart');
    return cartData ? JSON.parse(cartData) : {};
  };

  const saveCart = (cart) => {
    sessionStorage.setItem('tmCart', JSON.stringify(cart));
  };

  const handleAddToCart = () => {
    const cart = getCart();
    const langPairKey = `${sourceLang}|${targetLang}`;
    
    if (!cart[langPairKey]) {
      cart[langPairKey] = {
        sourceLang,
        targetLang,
        tus: []
      };
    }
    
    const selectedData = Array.from(selectedRows).map(index => data[index]);
    cart[langPairKey].tus.push(...selectedData);
    
    saveCart(cart);
    setSelectedRows(new Set()); // Clear selection after adding to cart
    
    // Trigger cart update event for header
    window.dispatchEvent(new Event('cartUpdated'));
    
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
          // Restore cursor position to end
          const length = inputElement.value.length;
          inputElement.setSelectionRange(length, length);
        }
      }, 10);
    }
  }, [data]); // Re-run when data changes (after table refresh)

  // Cleanup filter timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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
    <Box py={6} px={6}>
      <VStack gap={6} align="stretch">
        {/* Header with Add to Cart Button */}
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Flex align="center" gap={3}>
              <Text fontSize="2xl" fontWeight="bold">
                Translation Memory: {sourceLang} → {targetLang}
              </Text>
              {isLoading && (
                <Spinner size="sm" />
              )}
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
          <Text color="fg.muted">
            Detailed view of translation units
          </Text>
        </Box>

        {/* Table Container */}
        <Box bg="white" borderRadius="lg" shadow="sm" overflow="auto" maxH="70vh">
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
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">GUID</Text>
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
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">JOB GUID</Text>
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
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">RID</Text>
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
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">SID</Text>
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
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="350px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">NSRC</Text>
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
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">NTGT</Text>
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
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="40px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">Q</Text>
                    <Input
                      size="xs"
                      placeholder="Quality..."
                      value={inputValues.q}
                      onChange={(e) => handleFilterChange('q', e.target.value)}
                      onFocus={() => handleInputFocus('q')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.q = el; }}
                      bg="yellow.subtle"
                      key="q-input"
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">Provider</Text>
                    <Input
                      size="xs"
                      placeholder="Provider..."
                      value={inputValues.translationProvider}
                      onChange={(e) => handleFilterChange('translationProvider', e.target.value)}
                      onFocus={() => handleInputFocus('translationProvider')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.translationProvider = el; }}
                      bg="yellow.subtle"
                      key="translationProvider-input"
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">Timestamp</Text>
                    <Input
                      size="xs"
                      placeholder="Date..."
                      value={inputValues.ts}
                      onChange={(e) => handleFilterChange('ts', e.target.value)}
                      onFocus={() => handleInputFocus('ts')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.ts = el; }}
                      bg="yellow.subtle"
                      key="ts-input"
                    />
                  </VStack>
                </Box>
              </Box>
            </Box>
            <Box as="tbody">
              {data.map((item, index) => (
                <Box 
                  as="tr" 
                  key={`${item.guid}-${index}`}
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
                      color="green.600"
                      userSelect="all"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      maxW="100px"
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
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Text fontSize="xs">
                      {item.q}
                    </Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Text fontSize="xs">{item.translationProvider}</Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Text fontSize="xs" color="fg.muted" cursor="help">
                          {formatTimestamp(item.ts)}
                        </Text>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content>
                          <Tooltip.Arrow />
                          <Text fontSize="sm">
                            Job Date: {formatTimestamp(item.updatedAt)}
                          </Text>
                        </Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
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
      </VStack>
    </Box>
  );
};

export default TMDetail;