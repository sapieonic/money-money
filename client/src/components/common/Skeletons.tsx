import React from 'react';
import { Box, Grid, Paper, Skeleton, Stack } from '@mui/material';

interface SkeletonListProps {
  rows?: number;
}

export const SkeletonSummaryCards: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid size={{ xs: 6, sm: 12 / count }} key={i}>
        <Paper sx={{ p: 2 }}>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="text" width="70%" height={32} sx={{ mt: 1 }} />
        </Paper>
      </Grid>
    ))}
  </Grid>
);

export const SkeletonFilterBar: React.FC = () => (
  <Box sx={{ mb: 3 }}>
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" width={80} height={28} />
      ))}
    </Stack>
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <Skeleton variant="rounded" width={150} height={40} />
      <Skeleton variant="rounded" width={150} height={40} />
      <Skeleton variant="rounded" width={150} height={40} />
    </Stack>
  </Box>
);

export const SkeletonList: React.FC<SkeletonListProps> = ({ rows = 6 }) => (
  <Paper sx={{ p: 2 }}>
    <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider', my: 1 }} />}>
      {Array.from({ length: rows }).map((_, i) => (
        <Stack key={i} direction="row" alignItems="center" spacing={2} sx={{ py: 1 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="30%" />
          </Box>
          <Skeleton variant="text" width={80} />
        </Stack>
      ))}
    </Stack>
  </Paper>
);

export const SkeletonDailyExpenses: React.FC = () => (
  <Box>
    <SkeletonSummaryCards count={3} />
    <Skeleton variant="rounded" height={260} sx={{ mb: 3 }} />
    <SkeletonFilterBar />
    <SkeletonList rows={6} />
  </Box>
);
