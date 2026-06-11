import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
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
import type { Snapshot } from '../../types';
import { formatCompactNumber, formatCurrency } from '../../utils/formatters';
import { categoryColors } from '../../theme/theme';

interface TrendChartProps {
  snapshots: Snapshot[];
}

const monthShort = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'short' });
};

const TrendChart: React.FC<TrendChartProps> = ({ snapshots }) => {
  // Snapshots arrive newest-first; chart reads left-to-right oldest-first.
  const data = [...snapshots]
    .reverse()
    .map((s) => ({
      month: monthShort(s.month),
      Income: s.totalIncome,
      Expenses: s.totalExpenses,
      Invested: s.totalSIPs + s.totalVoluntaryInvestments,
    }));

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Cash Flow Trend
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Income, expenses and investing over the last {data.length} month{data.length === 1 ? '' : 's'}
      </Typography>

      {data.length < 2 ? (
        <Box
          sx={{
            height: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            Trends will appear here once you have a couple of months of history.
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={categoryColors.income} stopOpacity={0.25} />
                <stop offset="100%" stopColor={categoryColors.income} stopOpacity={0} />
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
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="Income"
              stroke={categoryColors.income}
              strokeWidth={2}
              fill="url(#incomeFill)"
            />
            <Line
              type="monotone"
              dataKey="Expenses"
              stroke={categoryColors.expenses}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Invested"
              stroke={categoryColors.sip}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

export default TrendChart;
