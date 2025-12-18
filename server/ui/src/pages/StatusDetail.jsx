import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Text,
  Box,
  Spinner,
  VStack,
  Input,
  Badge,
  Button,
  Flex,
  HStack,
  Checkbox,
  Tooltip,
  Link
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import ErrorBox from '../components/ErrorBox';

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

const StatusDetail = () => {
  const { channelId, sourceLang, targetLang } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prj = searchParams.get('prj');
  
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    guid: '',
    channel: '',
    prj: '',
    rid: '',
    sid: '',
    nsrc: '',
    group: ''
  });
  
  // Separate state for input values to prevent focus loss
  const [inputValues, setInputValues] = useState({
    guid: '',
    channel: '',
    prj: '',
    rid: '',
    sid: '',
    nsrc: '',
    group: ''
  });

  const timeoutRef = useRef();
  const focusedInputRef = useRef(null);
  const inputRefs = useRef({});
  
  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['statusDetail', channelId, sourceLang, targetLang, prj],
    queryFn: () => fetchApi(`/api/status/${channelId}/${sourceLang}/${targetLang}${prj ? `?prj=${encodeURIComponent(prj)}` : ''}`),
  });

  // Apply client-side filtering
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value.trim()) return true;
        
        const itemValue = item[key];
        if (itemValue === null || itemValue === undefined) return false;
        
        // Handle nsrc special case (array)
        if (key === 'nsrc' && Array.isArray(itemValue)) {
          const flattenedValue = flattenNormalizedSourceToOrdinal(itemValue);
          return flattenedValue.toLowerCase().includes(value.toLowerCase());
        }
        
        return String(itemValue).toLowerCase().includes(value.toLowerCase());
      });
    });
  }, [data, filters]);

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
    
    // Debounce the filter update
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, [column]: value }));
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
      const allIndices = new Set(filteredData.map((_, index) => index));
      setSelectedRows(allIndices);
    } else {
      setSelectedRows(new Set());
    }
  };

  const getCart = () => {
    const cartData = sessionStorage.getItem('statusCart');
    return cartData ? JSON.parse(cartData) : {};
  };

  const saveCart = (cart) => {
    sessionStorage.setItem('statusCart', JSON.stringify(cart));
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
    
    const selectedData = Array.from(selectedRows).map(index => filteredData[index]);
    cart[langPairKey].tus.push(...selectedData);
    
    saveCart(cart);
    setSelectedRows(new Set()); // Clear selection after adding to cart
    
    // Trigger cart update event for header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const isAllSelected = filteredData.length > 0 && selectedRows.size === filteredData.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length;

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
  }, [filteredData]);

  // Cleanup filter timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box mt={5} px={6}>
        <ErrorBox error={error} fallbackMessage="Failed to fetch status data" />
      </Box>
    );
  }

  return (
    <Box py={6} px={6}>
      {/* Channel Card Container */}
      <Box
        p={6}
        borderWidth="2px"
        borderRadius="lg"
        bg="white"
        borderColor="green.200"
      >
        {/* Channel Header with Language Pair and TU Count */}
        <Box display="flex" alignItems="center" gap={6} flexWrap="wrap" mb={6} pb={4} borderBottom="2px" borderColor="green.100">
          <Box>
            <Text fontSize="sm" color="fg.muted" mb={1}>Channel</Text>
            <Text fontSize="lg" fontWeight="bold" color="green.600">
              {channelId}
            </Text>
          </Box>
          <Box>
            <Text fontSize="sm" color="fg.muted" mb={1}>Language Pair</Text>
            <Flex align="center" gap={2}>
              <Text fontSize="lg" fontWeight="semibold" color="blue.600">
                {sourceLang} → {targetLang}
              </Text>
              {isLoading && (
                <Spinner size="sm" />
              )}
            </Flex>
          </Box>
          {prj && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>Project</Text>
              <Text fontSize="lg" fontWeight="semibold" color="purple.600">
                {prj}
              </Text>
            </Box>
          )}
          <Box>
            <Text fontSize="sm" color="fg.muted" mb={1}>Translation Units</Text>
            <Text fontSize="lg" fontWeight="medium">
              {filteredData.length} of {data.length} shown
            </Text>
          </Box>
          <Box ml="auto">
            {selectedRows.size > 0 && (
              <Button
                colorPalette="blue"
                onClick={handleAddToCart}
              >
                Add to Cart ({selectedRows.size} {selectedRows.size === 1 ? 'TU' : 'TUs'})
              </Button>
            )}
          </Box>
        </Box>

          {/* Table Container */}
          <Box bg="white" borderRadius="lg" shadow="sm" overflow="auto" h="calc(100vh - 250px)">
          <Box as="table" w="100%" fontSize="sm">
            <Box 
              as="thead" 
              position="sticky" 
              top={0} 
              bg="orange.subtle" 
              zIndex={1}
              borderBottom="2px"
              borderColor="orange.muted"
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
                    <Text fontSize="sm" fontWeight="bold" color="orange.600">GUID</Text>
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
                    <Text fontSize="sm" fontWeight="bold" color="orange.600">CHANNEL</Text>
                    <Input
                      size="xs"
                      placeholder="Filter channel..."
                      value={inputValues.channel}
                      onChange={(e) => handleFilterChange('channel', e.target.value)}
                      onFocus={() => handleInputFocus('channel')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.channel = el; }}
                      bg="yellow.subtle"
                      key="channel-input"
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="orange.600">PRJ</Text>
                    <Input
                      size="xs"
                      placeholder="Filter project..."
                      value={inputValues.prj}
                      onChange={(e) => handleFilterChange('prj', e.target.value)}
                      onFocus={() => handleInputFocus('prj')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.prj = el; }}
                      bg="yellow.subtle"
                      key="prj-input"
                    />
                  </VStack>
                </Box>
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="150px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="orange.600">RID</Text>
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
                    <Text fontSize="sm" fontWeight="bold" color="orange.600">SID</Text>
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
                    <Text fontSize="sm" fontWeight="bold" color="orange.600">NSRC</Text>
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
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="120px" textAlign="left">
                  <VStack gap={2} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="orange.600">GROUP</Text>
                    <Input
                      size="xs"
                      placeholder="Filter group..."
                      value={inputValues.group}
                      onChange={(e) => handleFilterChange('group', e.target.value)}
                      onFocus={() => handleInputFocus('group')}
                      onBlur={handleInputBlur}
                      ref={(el) => { if (el) inputRefs.current.group = el; }}
                      bg="yellow.subtle"
                      key="group-input"
                    />
                  </VStack>
                </Box>
              </Box>
            </Box>
            <Box as="tbody">
              {filteredData.map((item, index) => (
                <Box 
                  as="tr" 
                  key={`${item.guid}-${index}`}
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
                      color="orange.600"
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
                    <Text fontSize="xs">{item.channel}</Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Text fontSize="xs">{item.prj}</Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Link
                      as={RouterLink}
                      to={`/sources/${item.channel}?rid=${encodeURIComponent(item.rid)}`}
                      fontSize="xs"
                      fontFamily="mono"
                      color="blue.600"
                      wordBreak="break-all"
                      whiteSpace="normal"
                      _hover={{ textDecoration: "underline" }}
                    >
                      {item.rid}
                    </Link>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Text fontSize="xs" wordBreak="break-all" whiteSpace="normal">{item.sid}</Text>
                  </Box>
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    {item.notes && (item.notes.desc?.trim() || (item.notes.ph && Object.keys(item.notes.ph).length > 0)) ? (
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
                              {item.notes.desc?.trim() && (
                                <Text fontSize="sm" mb={2} whiteSpace="pre-wrap" color="black">
                                  {item.notes.desc}
                                </Text>
                              )}
                              {item.notes.ph && Object.keys(item.notes.ph).length > 0 && (
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
                    <Text fontSize="xs">{item.group}</Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
          
          {filteredData.length === 0 && !isLoading && (
            <Flex justify="center" p={8}>
              <Text color="fg.muted">
                No untranslated content found for the current filters
              </Text>
            </Flex>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default StatusDetail;