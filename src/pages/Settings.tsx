import React from 'react';
import { Container, Box, Typography } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Impostazioni
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configura le tue preferenze
        </Typography>
      </Box>
    </Container>
  );
};

export default Settings;


