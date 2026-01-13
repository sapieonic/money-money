import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';

interface SummaryCardProps {
  title: string;
  amount: number;
  currency?: string;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
  compact?: boolean;
  sx?: SxProps<Theme>;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  amount,
  currency = 'INR',
  icon,
  color = '#1976d2',
  subtitle,
  compact = false,
  sx,
  onClick,
}) => {
  const formattedAmount = compact
    ? formatCompactNumber(amount)
    : formatCurrency(amount, currency);

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            }
          : {},
        ...sx,
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 0.5, fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: color,
              }}
            >
              {compact ? `₹${formattedAmount}` : formattedAmount}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                backgroundColor: `${color}15`,
                borderRadius: 2,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
