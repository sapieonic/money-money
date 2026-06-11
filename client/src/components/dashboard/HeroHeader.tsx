import React from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import { formatCurrency } from '../../utils/formatters';

interface HeroHeaderProps {
  displayName: string;
  remaining: number;
  savingsRate: number;
  /** Fraction of the current month elapsed, 0–1. */
  monthProgress: number;
}

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const HeroHeader: React.FC<HeroHeaderProps> = ({
  displayName,
  remaining,
  savingsRate,
  monthProgress,
}) => {
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long' });
  const isPositive = remaining >= 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 4 },
        mb: 3,
        borderRadius: 4,
        color: 'common.white',
        background: 'linear-gradient(120deg, #1565c0 0%, #2196f3 55%, #00bcd4 100%)',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'flex-end' },
        gap: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
        }}
      />

      <Box sx={{ zIndex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {greeting()}, {displayName} 👋
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
          {dateLabel}
        </Typography>
      </Box>

      <Box sx={{ zIndex: 1, minWidth: { md: 320 }, width: { xs: '100%', md: 'auto' } }}>
        <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>
          {isPositive ? 'Left to spend this month' : 'Over budget this month'}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1, my: 0.5 }}>
          {formatCurrency(Math.abs(remaining))}
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(monthProgress * 100, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.25)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: 'common.white',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {Math.round(monthProgress * 100)}% of {monthLabel} elapsed
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {savingsRate.toFixed(0)}% saved
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default HeroHeader;
