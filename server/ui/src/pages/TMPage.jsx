import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Text, Box, Input, Spinner, Alert,
  Table, Flex, Breadcrumb, Grid
} from '@chakra-ui/react';
import { fetchApi } from './HomePage';

function getPairName(source, target) {
    return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}


const TMPage = () => {
  const { sourceLang, targetLang } = useParams();
  // State holds the entire object returned by the /tm/stats endpoint (summary + units)
  const [tmInfo, setTmInfo] = useState({ summary: { totalUnits: 0, lastUpdated: 'N/A' }, units: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Filters, Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTMData = async () => {
      setLoading(true);
      setError(null);
      setTmInfo({ summary: { totalUnits: 0, lastUpdated: 'N/A' }, units: [] }); // Clear previous data
      try {
        // Fetch from the /api/tm/stats endpoint
        const data = await fetchApi(`/api/tm/stats/${sourceLang}/${targetLang}`);
        setTmInfo(data || { summary: { totalUnits: 0, lastUpdated: 'N/A' }, units: [] }); // Ensure fallback
      } catch (err) {
        console.error("Error fetching TM data:", err);
        setError(err.message || `Failed to load Translation Memory for ${getPairName(sourceLang, targetLang)}.`);
      } finally {
        setLoading(false);
      }
    };
    
    if (sourceLang && targetLang) {
      fetchTMData();
    }
  }, [sourceLang, targetLang]);

  // Filtered Units logic (accesses tmInfo.units)
  const filteredUnits = useMemo(() => {
    if (!tmInfo || !Array.isArray(tmInfo.units)) return [];
    return tmInfo.units.filter(unit =>
      searchTerm === '' ||
      (unit.sourceText && unit.sourceText.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (unit.targetText && unit.targetText.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tmInfo.units, searchTerm]);

  const rowCount = filteredUnits.length;
  const paginatedUnits = filteredUnits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="6xl" mt={4} mb={4}>
      {/* Breadcrumbs */}
      <Breadcrumb.Root mb={2}>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild>
              <RouterLink to="/">Home</RouterLink>
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Breadcrumb.Link>Translation Memory</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <Text fontSize="4xl" fontWeight="medium" mb={2}>
        Translation Memory: {getPairName(sourceLang, targetLang)}
      </Text>
      <Text fontSize="lg" color="fg.muted" mb={3}>
        Browse existing translations.
      </Text>

      {/* Summary Stats */}
      {!loading && !error && tmInfo.summary && (
        <Box p={4} mb={3} borderWidth="1px" borderRadius="md" bg="bg.paper">
          <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
            <Box>
              <Text fontWeight="semibold">Total TM Units:</Text>
              <Text fontSize="lg">{tmInfo.summary.totalUnits?.toLocaleString() || 'N/A'}</Text>
            </Box>
            <Box>
              <Text fontWeight="semibold">Languages:</Text>
              <Text fontSize="lg">{getPairName(sourceLang, targetLang)}</Text>
            </Box>
            <Box>
              <Text fontWeight="semibold">Last Updated:</Text>
              <Text fontSize="lg">{tmInfo.summary.lastUpdated || 'N/A'}</Text>
            </Box>
          </Grid>
        </Box>
      )}

      {/* Filter/Search Controls */}
      <Box p={4} mb={3} borderWidth="1px" borderRadius="md" bg="bg.paper">
        <Input
          placeholder="Search Source or Target Text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
          maxWidth="500px"
        />
      </Box>

      {/* Loading and Error States */}
      {loading && (
        <Box display="flex" justifyContent="center" my={5}>
          <Spinner size="xl" />
        </Box>
      )}
      
      {error && (
        <Alert.Root status="error" my={2}>
          <Alert.Indicator />
          <Alert.Title>Error</Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}

      {/* TM Table */}
      {!loading && !error && (
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader width="40%">Source Text</Table.ColumnHeader>
                <Table.ColumnHeader width="40%">Target Text</Table.ColumnHeader>
                <Table.ColumnHeader width="10%">Quality</Table.ColumnHeader>
                <Table.ColumnHeader width="10%">Modified</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {paginatedUnits.map((unit) => (
                <Table.Row key={unit.id}>
                  <Table.Cell maxWidth="400px">
                    <Text truncate>{unit.sourceText}</Text>
                  </Table.Cell>
                  <Table.Cell maxWidth="400px">
                    <Text truncate>{unit.targetText}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text 
                      fontSize="sm" 
                      color={unit.quality >= 0.8 ? "green.fg" : unit.quality >= 0.6 ? "orange.fg" : "red.fg"}
                    >
                      {Math.round(unit.quality * 100)}%
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {unit.lastModified ? new Date(unit.lastModified).toLocaleDateString() : '-'}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
              
              {/* No results message */}
              {rowCount === 0 && !loading && (
                <Table.Row>
                  <Table.Cell colSpan={4} textAlign="center" py={8}>
                    <Text color="fg.muted">No translation memory units found for this language pair.</Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
          
          {/* Simple pagination info */}
          {rowCount > 0 && (
            <Box p={4} borderTopWidth="1px">
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" color="fg.muted">
                  Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, rowCount)} of {rowCount} entries
                </Text>
                <Flex gap={2}>
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: page === 0 ? '#f5f5f5' : 'white',
                      cursor: page === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * rowsPerPage >= rowCount}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: (page + 1) * rowsPerPage >= rowCount ? '#f5f5f5' : 'white',
                      cursor: (page + 1) * rowsPerPage >= rowCount ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </Flex>
              </Flex>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};

export default TMPage; 