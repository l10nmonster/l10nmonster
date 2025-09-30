import React, { useState } from 'react';
import { Box, Text, Badge, Flex, Button, VStack, Select, Spinner, Dialog, Input, Textarea } from '@chakra-ui/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import { renderTextWithLinks } from '../utils/textUtils.jsx';

const CartLanguagePair = ({ langPairKey, tus, onRemoveTU }) => {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [showJobModal, setShowJobModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [jobInstructions, setJobInstructions] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [jobStatus, setJobStatus] = useState(null);
  const [showJobStatusModal, setShowJobStatusModal] = useState(false);

  const { data: info = {}, isLoading: providersLoading } = useQuery({
    queryKey: ['info'],
    queryFn: () => fetchApi('/api/info'),
  });

  const providers = info.providers || [];

  const createJobsMutation = useMutation({
    mutationFn: async ({ sourceLang, targetLang, tus, providerList }) => {
      const response = await fetch('/api/dispatcher/createJobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceLang,
          targetLang,
          tus,
          providerList,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create jobs');
      }
      
      return response.json();
    },
  });

  const startJobsMutation = useMutation({
    mutationFn: async ({ jobs, instructions }) => {
      const response = await fetch('/api/dispatcher/startJobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobs,
          instructions,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start jobs');
      }
      
      return response.json();
    },
  });

  const getQualityColor = (quality) => {
    if (quality >= 80) return 'green';
    if (quality >= 60) return 'yellow';
    if (quality >= 40) return 'orange';
    return 'red';
  };

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


  const handleCreateJob = async () => {
    if (!selectedProvider) {
      alert('Please select a provider first');
      return;
    }
    
    const actualTus = Array.isArray(tus) ? tus : tus.tus;
    const providerId = typeof selectedProvider === 'object' && selectedProvider?.id ? selectedProvider.id : selectedProvider;

    try {
      // Minimize payload - only send channel and guid for each TU
      const minimalTus = actualTus.map(tu => ({
        channel: tu.channel,
        guid: tu.guid
      }));

      const jobs = await createJobsMutation.mutateAsync({
        sourceLang,
        targetLang,
        tus: minimalTus,
        providerList: [providerId],
      });
      
      // Look for job with matching provider
      const matchingJob = jobs.find(job => job.translationProvider === providerId);
      
      if (!matchingJob) {
        setErrorMessage(`Provider "${providerId}" did not accept any of the selected translation units.`);
        setShowErrorModal(true);
      } else {
        setJobData(matchingJob);
        setJobInstructions('');
        setShowJobModal(true);
      }
    } catch (error) {
      setErrorMessage(`Failed to create job: ${error.message}`);
      setShowErrorModal(true);
    }
  };

  const handleProviderSelect = (providerId) => {
    setSelectedProvider(providerId);
  };

  const handlePushJob = async () => {
    if (!jobData) return;
    
    try {
      const jobStatuses = await startJobsMutation.mutateAsync({
        jobs: [jobData],
        instructions: jobInstructions || undefined,
      });
      
      // Get the status for our job
      const status = jobStatuses.find(s => s.jobGuid === jobData.jobGuid) || jobStatuses[0];
      setJobStatus(status);
      setShowJobModal(false);
      setShowJobStatusModal(true);
    } catch (error) {
      setErrorMessage(`Failed to start job: ${error.message}`);
      setShowErrorModal(true);
    }
  };

  const handleCloseJobStatus = () => {
    setShowJobStatusModal(false);
    setJobStatus(null);
    setJobData(null);
    setJobInstructions('');
    
    // Remove processed TUs from cart based on their GUIDs
    if (jobData && jobData.tus) {
      const processedGuids = new Set(jobData.tus.map(tu => tu.guid));
      const actualTus = Array.isArray(tus) ? tus : tus.tus;
      
      // Find indices of TUs to remove (iterate backwards to avoid index issues)
      for (let i = actualTus.length - 1; i >= 0; i--) {
        if (processedGuids.has(actualTus[i].guid)) {
          onRemoveTU(langPairKey, i);
        }
      }
    }
  };

  const formatCost = (estimatedCost) => {
    if (estimatedCost === 0) return 'Free';
    if (estimatedCost === undefined || estimatedCost === null) return 'Unknown';
    // TODO: Use mm.currencyFormatter.format(estimatedCost) when available
    return `$${estimatedCost.toFixed(2)}`;
  };
  const actualTus = Array.isArray(tus) ? tus : tus.tus;
  const sourceLang = Array.isArray(tus) ? langPairKey.split('|')[0] || langPairKey.split('→')[0] : tus.sourceLang;
  const targetLang = Array.isArray(tus) ? langPairKey.split('|')[1] || langPairKey.split('→').slice(1).join('→') : tus.targetLang;

  // Determine which columns to show based on available data
  const showTargetColumn = actualTus.some(tu => tu.ntgt !== undefined);
  const showChannelColumn = actualTus.some(tu => tu.channel !== undefined);

  return (
    <Box 
      p={6} 
      borderWidth="1px" 
      borderRadius="lg" 
      bg="white" 
      shadow="sm"
    >
      <VStack gap={4} align="stretch">
        {/* Language Pair Header */}
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Flex align="center" gap={3}>
              <Badge colorPalette="blue" size="sm">
                {sourceLang}
              </Badge>
              <Text color="fg.muted" fontSize="lg">→</Text>
              <Badge colorPalette="green" size="sm">
                {targetLang}
              </Badge>
              
              {/* Provider Selection and Create Job */}
              <Flex align="center" gap={3} ml={4}>
                <Select.Root 
                  size="sm" 
                  width="250px"
                  value={selectedProvider ? [selectedProvider] : []}
                  onValueChange={(details) => {
                    // Note: Using direct onClick on Select.Item instead due to Chakra UI v3 issues
                  }}
                  positioning={{ 
                    strategy: "absolute",
                    placement: "bottom-start",
                    flip: true,
                    gutter: 4
                  }}
                >
                  <Select.Trigger>
                    <Text fontSize="sm" flex="1" textAlign="left">
                      {typeof selectedProvider === 'object' && selectedProvider?.id ? selectedProvider.id : selectedProvider || "Select Provider"}
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
                      minW="250px"
                      maxH="200px"
                      overflow="auto"
                    >
                    {providersLoading ? (
                      <Box p={3} textAlign="center">
                        <Spinner size="sm" />
                        <Text fontSize="sm" color="fg.muted" mt={2}>
                          Loading providers...
                        </Text>
                      </Box>
                    ) : (
                      providers
                        .slice()
                        .sort((a, b) => {
                          const aName = typeof a === 'object' && a?.id ? a.id : a;
                          const bName = typeof b === 'object' && b?.id ? b.id : b;
                          return aName.localeCompare(bName);
                        })
                        .map((providerId, index) => (
                        <Select.Item
                          key={`provider-${index}-${typeof providerId === 'string' ? providerId : JSON.stringify(providerId)}`}
                          item={providerId}
                          value={providerId}
                          onClick={() => handleProviderSelect(providerId)}
                        >
                          <Select.ItemText>{typeof providerId === 'object' && providerId?.id ? providerId.id : providerId}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))
                    )}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
                
                <Button
                  size="sm"
                  colorPalette="blue"
                  onClick={handleCreateJob}
                  disabled={!selectedProvider}
                  loading={createJobsMutation.isPending}
                >
                  Create Job
                </Button>
              </Flex>
            </Flex>
            
            <Text fontSize="sm" color="fg.muted">
              {actualTus.length} {actualTus.length === 1 ? 'TU' : 'TUs'}
            </Text>
          </Flex>
        </Box>

        {/* TUs Table */}
        <Box bg="white" borderRadius="md" overflow="auto">
          <Box as="table" w="100%" fontSize="sm">
            <Box 
              as="thead" 
              bg="blue.subtle"
              borderBottom="2px"
              borderColor="blue.muted"
              shadow="sm"
            >
              <Box as="tr">
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" textAlign="left" minW="120px">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">GUID</Text>
                </Box>
                {showChannelColumn && (
                  <Box as="th" p={3} borderBottom="1px" borderColor="border.default" textAlign="left" minW="120px">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">CHANNEL</Text>
                  </Box>
                )}
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" textAlign="left" minW="350px">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">SOURCE</Text>
                </Box>
                {showTargetColumn && (
                  <Box as="th" p={3} borderBottom="1px" borderColor="border.default" textAlign="left" minW="350px">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">TARGET</Text>
                  </Box>
                )}
                <Box as="th" p={3} borderBottom="1px" borderColor="border.default" textAlign="center" minW="100px">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">ACTION</Text>
                </Box>
              </Box>
            </Box>
            <Box as="tbody">
              {actualTus.map((tu, index) => (
                <Box
                  as="tr"
                  key={`cart-tu-${index}-${typeof tu.guid === 'string' ? tu.guid : tu.nid || index}`}
                  _hover={{ bg: "gray.subtle" }}
                >
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
                      {tu.guid}
                    </Text>
                  </Box>
                  {showChannelColumn && (
                    <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                      <Text fontSize="xs">{tu.channel || ''}</Text>
                    </Box>
                  )}
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                    <Text fontSize="xs" noOfLines={2} dir={sourceLang?.startsWith('he') || sourceLang?.startsWith('ar') ? 'rtl' : 'ltr'}>
                      {Array.isArray(tu.nsrc) ? flattenNormalizedSourceToOrdinal(tu.nsrc) : tu.nsrc}
                    </Text>
                  </Box>
                  {showTargetColumn && (
                    <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                      <Text fontSize="xs" noOfLines={2} dir={targetLang?.startsWith('he') || targetLang?.startsWith('ar') ? 'rtl' : 'ltr'}>
                        {Array.isArray(tu.ntgt) ? flattenNormalizedSourceToOrdinal(tu.ntgt) : tu.ntgt || ''}
                      </Text>
                    </Box>
                  )}
                  <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                    <Button
                      size="xs"
                      colorPalette="red"
                      variant="outline"
                      onClick={() => onRemoveTU(langPairKey, index)}
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </VStack>

      {/* Job Success Modal */}
      <Dialog.Root open={showJobModal} onOpenChange={(details) => setShowJobModal(details.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px">
            <Dialog.Header>
              <Dialog.Title>Job Created Successfully</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              {jobData && (
                <VStack gap={4} align="stretch">
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="green.600" mb={3}>
                      {jobData.tus?.length || 0} TUs accepted out of {actualTus.length} sent
                    </Text>
                    <VStack gap={2} align="stretch">
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.default" display="inline">Provider: </Text>
                        <Text fontSize="sm" color="blue.600" fontFamily="mono" display="inline">{typeof selectedProvider === 'object' && selectedProvider?.id ? selectedProvider.id : selectedProvider}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.default" display="inline">Estimated Cost: </Text>
                        <Text fontSize="sm" color="green.600" fontWeight="medium" display="inline">{formatCost(jobData.estimatedCost)}</Text>
                      </Box>
                      {jobData.statusDescription && (
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold" color="fg.default" display="inline">Status: </Text>
                          <Text fontSize="sm" color="fg.muted" display="inline">
                            {renderTextWithLinks(jobData.statusDescription)}
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Job Instructions (optional):
                    </Text>
                    <Textarea
                      placeholder="Enter any specific instructions for this translation job..."
                      value={jobInstructions}
                      onChange={(e) => setJobInstructions(e.target.value)}
                      rows={3}
                    />
                  </Box>
                  
                  <Flex gap={3}>
                    <Button
                      colorPalette="gray"
                      variant="outline"
                      onClick={() => {
                        setShowJobModal(false);
                        setJobData(null);
                        setJobInstructions('');
                      }}
                      flex="1"
                      disabled={startJobsMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      colorPalette="green"
                      onClick={handlePushJob}
                      loading={startJobsMutation.isPending}
                      flex="1"
                    >
                      Push Job
                    </Button>
                  </Flex>
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Error Modal */}
      <Dialog.Root open={showErrorModal} onOpenChange={(details) => setShowErrorModal(details.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Job Creation Failed</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Text color="red.600">
                  {errorMessage}
                </Text>
                <Button
                  colorPalette="red"
                  onClick={() => setShowErrorModal(false)}
                  w="100%"
                >
                  Close
                </Button>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Job Status Modal */}
      <Dialog.Root open={showJobStatusModal} onOpenChange={(details) => {
        if (!details.open) handleCloseJobStatus();
      }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Job Started Successfully</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              {jobStatus && (
                <VStack gap={4} align="stretch">
                  <Box>
                    <VStack gap={2} align="stretch">
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.default" display="inline">Job ID: </Text>
                        <Text 
                          fontSize="sm"
                          fontFamily="mono" 
                          color="blue.600" 
                          cursor="pointer"
                          _hover={{ textDecoration: "underline" }}
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(`/job/${jobStatus.jobGuid}`, '_blank');
                          }}
                          display="inline"
                        >
                          {jobStatus.jobGuid}
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.default" display="inline">Provider: </Text>
                        <Text fontSize="sm" color="blue.600" fontFamily="mono" display="inline">{jobStatus.translationProvider}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.default" display="inline">Language Pair: </Text>
                        <Text fontSize="sm" color="purple.600" fontWeight="medium" display="inline">{jobStatus.sourceLang} → {jobStatus.targetLang}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.default" display="inline">Status: </Text>
                        <Text fontSize="sm" fontWeight="bold" color={jobStatus.status === 'completed' ? 'green.600' : 'orange.600'} display="inline">
                          {jobStatus.status.toUpperCase()}
                        </Text>
                      </Box>
                      
                      {jobStatus.statusDescription && (
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold" color="fg.default" mb={1}>Description:</Text>
                          <Text fontSize="sm" color="fg.muted" pl={2} borderLeft="2px" borderColor="blue.200">
                            {renderTextWithLinks(jobStatus.statusDescription)}
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                  
                  <Box>
                    <Button
                      colorPalette="blue"
                      onClick={handleCloseJobStatus}
                      w="100%"
                    >
                      Close & Remove TUs from Cart
                    </Button>
                  </Box>
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
};

export default CartLanguagePair;