import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Button, Checkbox, Paper, TextField, MenuItem, FormControl, InputLabel, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Breadcrumbs, Link,
  CircularProgress, Alert
} from '@mui/material';
import { fetchApi } from './HomePage'; // Import the helper function

function getPairName(source, target) {
    return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}

const UntranslatedPage = () => {
  const { sourceLang, targetLang } = useParams();
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Filters, Selection, Pagination (remains the same)
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
      fetchContent();
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

  // Handlers (handleSelectAllClick, handleClick, isSelected, handleChangePage, handleChangeRowsPerPage) remain the same
  const handleSelectAllClick = (event) => { /* ... no change ... */ };
  const handleClick = (event, id) => { /* ... no change ... */ };
  const isSelected = (id) => selected.indexOf(id) !== -1;
  const handleChangePage = (event, newPage) => { setPage(newPage); };
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

  const handleSendSelected = async () => {
      console.log("Sending selected items:", selected);
      // === API CALL (Conceptual with fetch) ===
      // try {
      //     await fetchApi(`/api/send-to-translation`, {
      //         method: 'POST',
      //         headers: { 'Content-Type': 'application/json' },
      //         body: JSON.stringify({
      //             ids: selected,
      //             sourceLang: sourceLang,
      //             targetLang: targetLang
      //         })
      //     });
      //    alert(`Successfully sent ${selected.length} items for translation.`);
      //    setSelected([]);
      // } catch (err) {
      //    console.error("Error sending items:", err);
      //    alert(err.message || "Failed to send items for translation.");
      // }
       // === END API CALL ===
      alert(`Mock: Would send ${selected.length} items for translation.`);
      setSelected([]);
  }

  const numSelected = selected.length;
  const rowCount = filteredContent.length;
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rowCount) : 0;

  // --- JSX (Mostly the same, ensure disabled states use 'loading') ---
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumbs, Titles */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>{/* ... */}</Breadcrumbs>
        <Typography variant="h1" gutterBottom>Untranslated Content: {getPairName(sourceLang, targetLang)}</Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>Strings ready...</Typography>

        {/* Filter Controls - Disable while loading */}
        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Search Source Text" /* ... */ disabled={loading} />
            <FormControl size="small" /* ... */ disabled={loading}> {/* Channel */} </FormControl>
            <FormControl size="small" /* ... */ disabled={loading}> {/* Project */} </FormControl>
        </Paper>

        {/* Action Button - Disable while loading */}
        <Box sx={{ mb: 2 }}>
            <Button variant="contained" onClick={handleSendSelected} disabled={numSelected === 0 || loading}>Send...</Button>
        </Box>

        {/* Loading and Error States */}
        {loading && <Box sx={{display: 'flex', justifyContent: 'center', my: 5}}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{my: 2}}>{error}</Alert>}

        {/* Table - Render only when not loading and no error */}
        {!loading && !error && (
            <Paper>
                <TableContainer>
                    <Table>
                        {/* TableHead - Disable checkbox if loading or no rows */}
                        <TableHead>
                             <TableRow>
                                 <TableCell padding="checkbox">
                                     <Checkbox /* ... */ disabled={loading || rowCount === 0} />
                                 </TableCell>
                                 {/* Other header cells */}
                             </TableRow>
                         </TableHead>
                        {/* TableBody */}
                        <TableBody>
                            {/* Render rows using filteredContent */}
                            {filteredContent
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row) => { /* ... TableRow logic ... */ })}
                            {/* Empty rows */}
                            {emptyRows > 0 && (<TableRow style={{ height: 53 * emptyRows }}><TableCell colSpan={6} /></TableRow>)}
                            {/* No results message */}
                            {rowCount === 0 && !loading && (
                                <TableRow><TableCell colSpan={6} align="center">No untranslated content...</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {/* TablePagination */}
                <TablePagination /* ... */ />
            </Paper>
        )}
    </Container>
  );
};

export default UntranslatedPage;
