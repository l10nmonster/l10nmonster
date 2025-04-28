import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LanguageIcon from '@mui/icons-material/Language'; // Placeholder logo
import AccountCircle from '@mui/icons-material/AccountCircle';

const Header = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo and Title linked to Home */}
        <Box sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', flexGrow: 1 }} component={RouterLink} to="/">
          <IconButton edge="start" color="inherit" aria-label="logo" sx={{ mr: 1 }}>
            <LanguageIcon /> {/* Replace with your actual logo component/image */}
          </IconButton>
          <Typography variant="h6" component="div">
            L10n Monster
          </Typography>
        </Box>

        {/* Optional: Right side icons */}
        <IconButton color="inherit">
          <AccountCircle />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;