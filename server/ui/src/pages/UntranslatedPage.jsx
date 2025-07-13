import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Text, Box, Button, Input, Spinner, Alert,
  Table, Flex, Breadcrumb
} from '@chakra-ui/react';
import { fetchApi } from './HomePage';

function getPairName(source, target) {
    return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}


const UntranslatedPage = () => {
  const { sourceLang, targetLang } = useParams();
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Filters, Selection, Pagination
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [channelFilter, setChannelFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      setAllContent([]);
      setSelected([]);
      try {
        // Use the correct endpoint and fetchApi helper
        const data = await fetchApi(`/api/untranslated/${sourceLang}/${targetLang}`);
        setAllContent(data);
      } catch (err) {
        console.error("Error fetching untranslated content:", err);
        setError(err.message || `Failed to load untranslated content for ${getPairName(sourceLang, targetLang)}.`);
      } finally {
        setLoading(false);
      }
    };
    
    if (sourceLang && targetLang) {
      fetchContent();
    }
  }, [sourceLang, targetLang]);

  const channels = useMemo(() => [...new Set(allContent.map(item => item.channel))], [allContent]);
  const projects = useMemo(() => [...new Set(allContent.map(item => item.project))], [allContent]);

  const filteredContent = useMemo(() => {
    return allContent.filter(item =>
      (channelFilter === '' || item.channel === channelFilter) &&
      (projectFilter === '' || item.project === projectFilter) &&
      (searchTerm === '' || (item.sourceText && item.sourceText.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [allContent, channelFilter, projectFilter, searchTerm]);

  const handleSelectAllClick = (checked) => {
    if (checked) {
      const newSelected = filteredContent.map(item => item.id);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const handleClick = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleSendSelected = async () => {
    console.log("Sending selected items:", selected);
    // Mock implementation
    alert(`Mock: Would send ${selected.length} items for translation.`);
    setSelected([]);
  };

  const numSelected = selected.length;
  const rowCount = filteredContent.length;
  const paginatedContent = filteredContent.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
            <Breadcrumb.Link>Untranslated Content</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <Text fontSize="4xl" fontWeight="medium" mb={2}>
        Untranslated Content: {getPairName(sourceLang, targetLang)}
      </Text>
      <Text fontSize="lg" color="fg.muted" mb={3}>
        Strings ready for translation.
      </Text>

      {/* Filter Controls */}
      <Box p={4} mb={3} borderWidth="1px" borderRadius="md" bg="bg.paper">
        <Flex gap={4} flexWrap="wrap">
          <Input
            placeholder="Search Source Text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
            maxWidth="300px"
          />
          <Box>
            <Text fontSize="sm" mb={1}>Channel</Text>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              disabled={loading}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
            >
              <option value="">All Channels</option>
              {channels.map(channel => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </Box>
          <Box>
            <Text fontSize="sm" mb={1}>Project</Text>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              disabled={loading}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </Box>
        </Flex>
      </Box>

      {/* Action Button */}
      <Box mb={2}>
        <Button
          onClick={handleSendSelected}
          disabled={numSelected === 0 || loading}
          colorPalette="brand"
        >
          Send {numSelected > 0 ? `${numSelected} items` : ''} for Translation
        </Button>
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

      {/* Table */}
      {!loading && !error && (
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>
                  <input
                    type="checkbox"
                    checked={numSelected === rowCount && rowCount > 0}
                    onChange={(e) => handleSelectAllClick(e.target.checked)}
                    disabled={loading || rowCount === 0}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </Table.ColumnHeader>
                <Table.ColumnHeader>Source Text</Table.ColumnHeader>
                <Table.ColumnHeader>Channel</Table.ColumnHeader>
                <Table.ColumnHeader>Project</Table.ColumnHeader>
                <Table.ColumnHeader>Resource</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {paginatedContent.map((row) => {
                const isItemSelected = isSelected(row.id);
                return (
                  <Table.Row
                    key={row.id}
                    onClick={() => handleClick(row.id)}
                    cursor="pointer"
                    _hover={{ bg: "bg.subtle" }}
                    bg={isItemSelected ? "bg.muted" : undefined}
                  >
                    <Table.Cell>
                      <input
                        type="checkbox"
                        checked={isItemSelected}
                        onChange={() => {}} // Handled by row click
                        style={{ transform: 'scale(1.2)' }}
                      />
                    </Table.Cell>
                    <Table.Cell maxWidth="400px">
                      <Text truncate>{row.sourceText}</Text>
                    </Table.Cell>
                    <Table.Cell>{row.channel}</Table.Cell>
                    <Table.Cell>{row.project}</Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted" truncate>
                        {row.resourcePath}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
              
              {/* No results message */}
              {rowCount === 0 && !loading && (
                <Table.Row>
                  <Table.Cell colSpan={5} textAlign="center" py={8}>
                    <Text color="fg.muted">No untranslated content found for this language pair.</Text>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * rowsPerPage >= rowCount}
                  >
                    Next
                  </Button>
                </Flex>
              </Flex>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};

export default UntranslatedPage; 