import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box, Typography } from '@mui/material';
import type { InvestmentStatus } from '../../types';

interface SIPStatusToggleProps {
  status: InvestmentStatus;
  onChange: (newStatus: InvestmentStatus) => void;
  disabled?: boolean;
}

const SIPStatusToggle: React.FC<SIPStatusToggleProps> = ({
  status,
  onChange,
  disabled = false,
}) => {
  const handleChange = (_: React.MouseEvent<HTMLElement>, newStatus: InvestmentStatus | null) => {
    if (newStatus !== null) {
      onChange(newStatus);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Status:
      </Typography>
      <ToggleButtonGroup
        value={status}
        exclusive
        onChange={handleChange}
        size="small"
        disabled={disabled}
      >
        <ToggleButton value="active" color="success">
          Active
        </ToggleButton>
        <ToggleButton value="paused" color="warning">
          Paused
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default SIPStatusToggle;
