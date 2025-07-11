import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Example blue
    },
    secondary: {
      main: '#dc004e', // Example secondary color
    },
    background: {
      default: '#f4f6f8', // Light grey background
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 500 },
    h2: { fontSize: '2rem', fontWeight: 500, marginTop: '1.5em', marginBottom: '0.8em' },
    h3: { fontSize: '1.5rem', fontWeight: 500, marginTop: '1em', marginBottom: '0.5em' },
    // Add other typography overrides if needed
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          marginBottom: '16px',
        }
      }
    }
  }
});

export default theme;