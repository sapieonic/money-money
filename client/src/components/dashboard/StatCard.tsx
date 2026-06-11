import React from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { ArrowDownward, ArrowUpward } from '@mui/icons-material';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  /** Already-formatted primary value, e.g. "₹12.4 L". */
  value: string;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
  /** Percentage change vs. the previous period. Positive renders green, negative red. */
  delta?: number;
  /** When true, a negative delta is treated as the "good" direction (e.g. debt, spend). */
  invertDelta?: boolean;
  /** Mini trend series for an inline sparkline. */
  sparkline?: number[];
  onClick?: () => void;
  /** Stagger index used to offset the entrance animation. */
  index?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#1976d2',
  subtitle,
  delta,
  invertDelta = false,
  sparkline,
  onClick,
  index = 0,
}) => {
  const hasDelta = delta !== undefined && Number.isFinite(delta);
  const isGood = hasDelta ? (invertDelta ? delta! <= 0 : delta! >= 0) : true;
  const deltaColor = isGood ? 'success.main' : 'error.main';
  const gradientId = `spark-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        animation: 'statCardIn 0.45s ease both',
        animationDelay: `${index * 60}ms`,
        '@keyframes statCardIn': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '&:hover': onClick
          ? { transform: 'translateY(-3px)', boxShadow: 6 }
          : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          backgroundColor: color,
        },
      }}
    >
      <CardContent sx={{ pl: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                backgroundColor: `${color}15`,
                borderRadius: 2,
                p: 0.75,
                display: 'flex',
                color,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
          {value}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, minHeight: 28 }}>
          {hasDelta && (
            <Chip
              size="small"
              icon={
                delta! >= 0 ? (
                  <ArrowUpward sx={{ fontSize: '0.85rem !important' }} />
                ) : (
                  <ArrowDownward sx={{ fontSize: '0.85rem !important' }} />
                )
              }
              label={`${Math.abs(delta!).toFixed(1)}%`}
              sx={{
                height: 22,
                fontWeight: 600,
                fontSize: '0.72rem',
                color: deltaColor,
                bgcolor: (theme) =>
                  isGood ? `${theme.palette.success.main}1A` : `${theme.palette.error.main}1A`,
                '& .MuiChip-icon': { color: deltaColor },
              }}
            />
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>

        {sparkline && sparkline.length > 1 && (
          <Box sx={{ height: 38, mt: 1, mx: -0.5 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline.map((v) => ({ v }))}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
