import React from 'react';
import { Box, Typography, Paper, Grid, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { WeeklyExpenseAnalytics } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface WeeklyAnalyticsChartsProps {
  analytics: WeeklyExpenseAnalytics;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6384',
  groceries: '#36A2EB',
  entertainment: '#FFCE56',
  shopping: '#4BC0C0',
  travel: '#9966FF',
  health: '#FF9F40',
  personal: '#C9CBCF',
  other: '#7C8798',
};

const VENDOR_COLORS = [
  '#2196F3',
  '#4CAF50',
  '#FF9800',
  '#E91E63',
  '#9C27B0',
];

const formatCategoryLabel = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const WeeklyAnalyticsCharts: React.FC<WeeklyAnalyticsChartsProps> = ({ analytics }) => {
  const theme = useTheme();

  const categoryData = analytics.categoryBreakdown.map((item) => ({
    name: formatCategoryLabel(item.category),
    value: item.total,
    percentage: item.percentage,
    color: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other,
  }));

  const vendorData = analytics.topVendors.slice(0, 5).map((item, index) => ({
    name: item.vendor || 'Unknown',
    value: item.total,
    count: item.count,
    color: VENDOR_COLORS[index % VENDOR_COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; percentage?: number; count?: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, boxShadow: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(data.value)}
          </Typography>
          {data.percentage !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {data.percentage.toFixed(1)}%
            </Typography>
          )}
          {data.count !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {data.count} transaction{data.count !== 1 ? 's' : ''}
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  if (analytics.transactionCount === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No expenses recorded this week
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        This Week&apos;s Spending ({analytics.weekStart} - {analytics.weekEnd})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total: {formatCurrency(analytics.totalSpent)} across {analytics.transactionCount} transactions
      </Typography>

      <Grid container spacing={3}>
        {/* Category Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle1" fontWeight={500} textAlign="center" gutterBottom>
            By Category
          </Typography>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage?.toFixed(0)}%)`}
                  labelLine={{ stroke: theme.palette.text.secondary, strokeWidth: 1 }}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">No category data</Typography>
            </Box>
          )}
        </Grid>

        {/* Vendor Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle1" fontWeight={500} textAlign="center" gutterBottom>
            Top Vendors
          </Typography>
          {vendorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={vendorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name }) => name.length > 12 ? `${name.slice(0, 12)}...` : name}
                  labelLine={{ stroke: theme.palette.text.secondary, strokeWidth: 1 }}
                >
                  {vendorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  formatter={(value: string) => (
                    <span style={{ color: theme.palette.text.primary, fontSize: '12px' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">No vendor data</Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Quick Stats */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Daily Avg
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {formatCurrency(analytics.avgDailySpend)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Top Category
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {analytics.topCategory ? formatCategoryLabel(analytics.topCategory.category) : '-'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              vs Last Week
            </Typography>
            <Typography
              variant="body1"
              fontWeight={600}
              color={
                analytics.weekComparison.trend === 'up'
                  ? 'error.main'
                  : analytics.weekComparison.trend === 'down'
                    ? 'success.main'
                    : 'text.primary'
              }
            >
              {analytics.weekComparison.trend === 'up' ? '+' : ''}
              {analytics.weekComparison.percentageChange.toFixed(0)}%
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Highest Day
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {analytics.highestSpendingDay?.dayName || '-'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default WeeklyAnalyticsCharts;
