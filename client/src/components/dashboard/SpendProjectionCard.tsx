import React from 'react';
import { Box, Paper, Typography, Skeleton, Divider } from '@mui/material';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dailyExpenseService } from '../../services/dailyExpenseService';
import { formatCompactNumber, formatCurrency } from '../../utils/formatters';
import { categoryColors } from '../../theme/theme';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const compactINR = (amount: number) =>
  `${amount < 0 ? '-' : ''}₹${formatCompactNumber(Math.abs(amount))}`;

// Full-precision rupees (e.g. ₹3,61,317) for the headline figures.
const fullINR = (amount: number) =>
  formatCurrency(Math.round(amount), 'INR', { maximumFractionDigits: 0 });

// Day-of-year for the last day of month `m` (1-12) in `year`.
const endOfMonthDayOfYear = (year: number, m: number): number => {
  const startOfYear = new Date(year, 0, 1);
  const endOfMonth = new Date(year, m, 0);
  return Math.floor((endOfMonth.getTime() - startOfYear.getTime()) / 86400000) + 1;
};

interface StatProps {
  label: string;
  value: string;
  caption: string;
  color?: string;
}

const Stat: React.FC<StatProps> = ({ label, value, caption, color }) => (
  <Box sx={{ flex: 1, minWidth: 120 }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {label}
    </Typography>
    <Typography variant="h5" fontWeight={700} sx={{ color: color || 'text.primary', lineHeight: 1.2 }}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {caption}
    </Typography>
  </Box>
);

const SpendProjectionCard: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['spend-projection'],
    queryFn: dailyExpenseService.getProjection,
  });

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Skeleton variant="text" width={220} height={32} />
        <Skeleton variant="text" width={320} height={20} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
      </Paper>
    );
  }

  if (isError || !data || data.spentSoFar <= 0) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Spend Projection
        </Typography>
        <Box
          sx={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            {isError
              ? 'Could not load your spend projection right now.'
              : 'Log a few daily expenses and your year-end projection will appear here.'}
          </Typography>
        </Box>
      </Paper>
    );
  }

  const { year, currentMonth, spentSoFar, dailyRunRate, daysElapsed, daysInYear, daysRemaining, projection } = data;

  const cumulativeByMonth = new Map(data.monthly.map((m) => [m.month, m.cumulative]));

  type Point = {
    month: string;
    actual: number | null;
    low: number | null;
    mid: number | null;
    high: number | null;
  };

  const chartData: Point[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const point: Point = { month: MONTH_LABELS[m - 1], actual: null, low: null, mid: null, high: null };

    if (m < currentMonth) {
      point.actual = cumulativeByMonth.get(m) ?? null;
    } else if (m === currentMonth) {
      // Anchor: projection lines start from where actual spend currently sits.
      point.actual = spentSoFar;
      point.low = spentSoFar;
      point.mid = spentSoFar;
      point.high = spentSoFar;
    } else {
      // Future month: linearly interpolate the remainder by elapsed-day proportion.
      const dayAtMonthEnd = Math.min(endOfMonthDayOfYear(year, m), daysInYear);
      const frac = daysRemaining > 0 ? Math.max(0, Math.min(1, (dayAtMonthEnd - daysElapsed) / daysRemaining)) : 1;
      point.low = spentSoFar + (projection.low - spentSoFar) * frac;
      point.mid = spentSoFar + (projection.mid - spentSoFar) * frac;
      point.high = spentSoFar + (projection.high - spentSoFar) * frac;
    }

    chartData.push(point);
  }

  const legendTotals: Record<string, number> = {
    Low: projection.low,
    Mid: projection.mid,
    High: projection.high,
  };

  const today = new Date();
  const spentCaption = `to ${today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Spend Projection
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cumulative tracked spend in {year}: actual (solid) and projected to Dec 31 (dashed)
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Stat label="Spent so far" value={fullINR(spentSoFar)} caption={spentCaption} />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
        <Stat label="Daily run-rate" value={fullINR(dailyRunRate)} caption="per day" />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
        <Stat
          label="Projected total"
          value={fullINR(projection.mid)}
          caption="mid case, Dec 31"
          color={categoryColors.voluntary}
        />
      </Box>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="spendActualFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={categoryColors.sip} stopOpacity={0.22} />
              <stop offset="100%" stopColor={categoryColors.sip} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.06)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(v) => formatCompactNumber(v as number)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(value as number), name as string]}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
            formatter={(value) => {
              const name = value as string;
              return legendTotals[name] !== undefined
                ? `${name} · ${compactINR(legendTotals[name])}`
                : name;
            }}
          />
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke={categoryColors.sip}
            strokeWidth={2.5}
            fill="url(#spendActualFill)"
            connectNulls
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="low"
            name="Low"
            stroke={categoryColors.income}
            strokeWidth={2}
            strokeDasharray="6 5"
            connectNulls
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="mid"
            name="Mid"
            stroke={categoryColors.voluntary}
            strokeWidth={2}
            strokeDasharray="6 5"
            connectNulls
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="high"
            name="High"
            stroke={categoryColors.assets}
            strokeWidth={2}
            strokeDasharray="6 5"
            connectNulls
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default SpendProjectionCard;
