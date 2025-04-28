import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Breadcrumbs, Link, Grid, CircularProgress, Alert
} from '@mui/material';
import { fetchApi } from './HomePage'; // Import the helper function

function getPairName(source, target) {
    return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}

const TMPage = () => {
  const { sourceLang, targetLang } = useParams();
  // State holds the entire object returned by the /tm/stats endpoint (summary + units)
  const [tmInfo, setTmInfo] = useState({ summary: {}, units: [] });
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
          setTmInfo({ summary: {}, units: [] }); // Clear previous data
          try {
              // Fetch from the /api/tm/stats endpoint
              const data = await fetchApi(`/api/tm/stats/${sourceLang}/${targetLang}`);
              setTmInfo(data || { summary: {}, units: [] }); // Ensure fallback
          } catch (err) {
              console.error("Error fetching TM data:", err);
              setError(err.message || `Failed to load Translation Memory for ${getPairName(sourceLang, targetLang)}.`);
          } finally {
              setLoading(false);
          }
      };
      fetchTMData();
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

  // Handlers (handleChangePage, handleChangeRowsPerPage) remain the same
  const handleChangePage = (event, newPage) => { setPage(newPage); };
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

  const rowCount = filteredUnits.length;
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rowCount) : 0;

  // --- JSX (Mostly the same, uses tmInfo.summary and filteredUnits, handles loading) ---
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumbs, Titles */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>{/* ... */}</Breadcrumbs>
        <Typography variant="h1" gutterBottom>Translation Memory: {getPairName(sourceLang, targetLang)}</Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>Browse existing translations.</Typography>

        {/* Summary Stats - Use tmInfo.summary */}
        {!loading && !error && tmInfo.summary && (
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="body1"><strong>Total TM Units:</strong> {tmInfo.summary.totalUnits?.toLocaleString() || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="body1"><strong>Languages:</strong> {getPairName(sourceLang, targetLang)}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="body1"><strong>Last Updated:</strong> {tmInfo.summary.lastUpdated || 'N/A'}</Typography>
                    </Grid>
                </Grid>
            </Paper>
        )}

        {/* Filter/Search Controls - Disable while loading */}
        <Paper sx={{ p: 2, mb: 3 }}>
            <TextField fullWidth label="Search Source or Target Text" /* ... */ disabled={loading} />
        </Paper>

        {/* Loading and Error States */}
        {loading && <Box sx={{display: 'flex', justifyContent: 'center', my: 5}}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{my: 2}}>{error}</Alert>}

        {/* TM Table - Use filteredUnits */}
        {!loading && !error && (
            <Paper>
                <TableContainer>
                    <Table>
                        {/* TableHead */}
                        <TableHead>{/* ... */}</TableHead>
                        {/* TableBody */}
                        <TableBody>
                             {/* Render rows using filteredUnits */}
                            {filteredUnits
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row) => (42 /* ... TableRow logic ... */ ))}
                            {/* Empty rows */}
                            {emptyRows > 0 && (<TableRow style={{ height: 53 * emptyRows }}><TableCell colSpan={5} /></TableRow>)}
                             {/* No results message */}
                            {rowCount === 0 && !loading && (
                                <TableRow><TableCell colSpan={5} align="center">No translation memory units...</TableCell></TableRow>
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

export default TMPage;
