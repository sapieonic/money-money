import React from 'react';
import { Box, Grid, Skeleton } from '@mui/material';

const DashboardSkeleton: React.FC = () => (
  <Box>
    <Skeleton variant="rounded" height={160} sx={{ borderRadius: 4, mb: 3 }} />
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Grid key={i} size={{ xs: 6, md: 3 }}>
          <Skeleton variant="rounded" height={150} sx={{ borderRadius: 4 }} />
        </Grid>
      ))}
    </Grid>
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Skeleton variant="rounded" height={360} sx={{ borderRadius: 4 }} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Skeleton variant="rounded" height={360} sx={{ borderRadius: 4 }} />
      </Grid>
    </Grid>
  </Box>
);

export default DashboardSkeleton;
