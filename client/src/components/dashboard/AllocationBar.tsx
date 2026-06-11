import React from 'react';
import { Box, Paper, Tooltip, Typography } from '@mui/material';
import { formatCurrency } from '../../utils/formatters';

export interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}

interface AllocationBarProps {
  title: string;
  subtitle?: string;
  data: AllocationSlice[];
}

const AllocationBar: React.FC<AllocationBarProps> = ({ title, subtitle, data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: 18,
          borderRadius: 99,
          overflow: 'hidden',
          backgroundColor: 'action.hover',
          mb: 2.5,
        }}
      >
        {data.map((slice) => (
          <Tooltip
            key={slice.name}
            title={`${slice.name}: ${formatCurrency(slice.value)} (${((slice.value / total) * 100).toFixed(1)}%)`}
            arrow
          >
            <Box
              sx={{
                width: `${(slice.value / total) * 100}%`,
                backgroundColor: slice.color,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.85 },
              }}
            />
          </Tooltip>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {data.map((slice) => (
          <Box key={slice.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 120 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: slice.color }} />
            <Typography variant="caption" color="text.secondary">
              {slice.name}
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {((slice.value / total) * 100).toFixed(0)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default AllocationBar;
