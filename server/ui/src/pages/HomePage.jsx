import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Grid, CircularProgress, Alert } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';

// Helper function for fetch requests
async function fetchApi(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            // Attempt to get error message from response body
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) { /* Ignore if response body is not JSON */ }
            const errorMessage = errorData?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        // Re-throw the error so it can be caught by the calling component
        throw error;
    }
}


const HomePage = () => {
  // State for status data (which includes pairs and projects)
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch overall status
        const data = await fetchApi(`/api/status`);
        setStatusData(data);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <Container sx={{display: 'flex', justifyContent: 'center', mt: 5}}><CircularProgress /></Container>;
  }

  if (error) {
      return <Container sx={{mt: 5}}><Alert severity="error">{error}</Alert></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h1" gutterBottom>
        Localization Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Overview of translation activity across all language pairs.
      </Typography>

      {/* Iterate over the status data which contains language pair info and projects */}
      {Object.entries(statusData).map(([ channelId, channelStatus ]) => (
          <Box key={`${channelId}`} sx={{ mb: 6, p: 3, border: '1px solid lightgrey', borderRadius: '8px', backgroundColor: 'background.paper' }}>
            <Typography variant="h3" sx={{mt: 0}}>Channel: {channelId}</Typography>

            {/* <Box sx={{ my: 2 }}>
              <Button
                variant="contained"
                component={RouterLink}
                to={`/untranslated/${pairData.source}/${pairData.target}`}
                sx={{ mr: 2 }}
              >
                View Untranslated Content
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                // Link to the TM page (uses the new stats endpoint name conceptually, but the route remains the same)
                to={`/tm/${pairData.source}/${pairData.target}`}
              >
                Browse Translation Memory
              </Button>
            </Box> */}

            {/* <Typography variant="h3" sx={{mt: 4}}>Project Status Overview</Typography> */}

            {Object.entries(channelStatus).map(([ prj, projectStatus ]) => (
              <Box key={channelId} sx={{ mt: 3 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'normal', fontSize: '1.3rem', borderBottom: '1px solid #eee', paddingBottom: '0.3em', marginBottom: '1em' }}>
                  Project: {prj}
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(projectStatus).map(([ sourceLang, statusBySourceLang ]) =>
                    Object.entries(statusBySourceLang).map(([ targetLang, projectDetails ]) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${sourceLang}-${targetLang}-${prj}`}>
                        <ProjectCard project={{ sourceLang, targetLang, ...projectDetails }} />
                      </Grid>
                    )))}
                </Grid>
              </Box>
            ))}
          </Box>
        )
      )}
       {/* Handle case where no language pairs were returned */}
       {Object.keys(statusData).length === 0 && !loading && (
           <Typography sx={{mt: 4}} color="text.secondary">No active content found.</Typography>
       )}
    </Container>
  );
};

export default HomePage;

// Export the helper function if you plan to use it in other files
export { fetchApi };
