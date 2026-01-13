import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  AccountBalance,
  Receipt,
  TrendingUp,
  Savings,
  AttachMoney,
  Money,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import SummaryCard from '../components/common/SummaryCard';
import { dashboardService } from '../services/dashboardService';
import { settingsService } from '../services/settingsService';
import type { DashboardData, Income } from '../types';
import { formatCurrency } from '../utils/formatters';
import { categoryColors } from '../theme/theme';

const incomeTypeColors: Record<string, string> = {
  salary: '#4caf50',
  freelance: '#2196f3',
  dividend: '#9c27b0',
  rental: '#ff9800',
  rsu_vesting: '#00bcd4',
  other: '#607d8b',
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(89);

  useEffect(() => {
    loadDashboard();
    loadSettings();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const result = await dashboardService.getDashboard();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await settingsService.get();
      setExchangeRate(settings.exchangeRates.USD || 89);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to get income amount in INR (RSU may be stored in USD)
  const getIncomeINR = (income: Income) => {
    if (income.type === 'rsu_vesting' && income.currency === 'USD') {
      return income.amount * exchangeRate;
    }
    return income.amount;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const { summary } = data;

  // Calculate total tax from incomes
  const totalTaxPaid = data.incomes.reduce((sum, inc) => sum + (inc.taxPaid || 0), 0);
  const totalGrossIncome = data.incomes.reduce((sum, inc) => {
    if (inc.type === 'rsu_vesting') {
      return sum + getIncomeINR(inc); // RSU has no pre-tax concept
    }
    return sum + (inc.preTaxAmount || inc.amount);
  }, 0);

  const allocationData = [
    { name: 'Tax', value: totalTaxPaid, color: categoryColors.tax },
    { name: 'Expenses', value: summary.totalExpenses, color: categoryColors.expenses },
    { name: 'SIPs', value: summary.totalSIPs, color: categoryColors.sip },
    { name: 'Investments', value: summary.totalVoluntaryInvestments, color: categoryColors.voluntary },
    { name: 'Remaining', value: summary.remaining, color: categoryColors.remaining },
  ].filter((item) => item.value > 0);

  const getIncomeTypeLabel = (type: string) => {
    switch (type) {
      case 'rsu_vesting': return 'RSU Vesting';
      case 'salary': return 'Salary';
      case 'freelance': return 'Freelance';
      case 'dividend': return 'Dividend';
      case 'rental': return 'Rental';
      default: return 'Other';
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Overview of your financial status
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Gross Income"
            amount={totalGrossIncome}
            color={categoryColors.income}
            icon={<AccountBalance />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Tax Paid"
            amount={totalTaxPaid}
            color={categoryColors.tax}
            icon={<Money />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Expenses"
            amount={summary.totalExpenses}
            color={categoryColors.expenses}
            icon={<Receipt />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="SIPs"
            amount={summary.totalSIPs}
            color={categoryColors.sip}
            icon={<TrendingUp />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Investments"
            amount={summary.totalVoluntaryInvestments}
            color={categoryColors.voluntary}
            icon={<Savings />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Remaining"
            amount={summary.remaining}
            color={categoryColors.remaining}
            icon={<AttachMoney />}
            compact
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Income Allocation Pie Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 'auto', minHeight: 420 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Monthly Allocation (from Gross Income)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How your gross income of {formatCurrency(totalGrossIncome)} is distributed
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: 20 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Income Sources with Tax */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 420, overflow: 'auto' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Income Sources
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Breakdown by source with tax deductions
            </Typography>
            <List dense disablePadding>
              {data.incomes.map((income) => (
                <ListItem
                  key={income._id}
                  sx={{
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {income.name}
                        </Typography>
                        <Chip
                          label={getIncomeTypeLabel(income.type)}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            backgroundColor: `${incomeTypeColors[income.type] || incomeTypeColors.other}20`,
                            color: incomeTypeColors[income.type] || incomeTypeColors.other,
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        {income.type === 'rsu_vesting' ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="info.main">
                              {formatCurrency(getIncomeINR(income))}/month
                            </Typography>
                            {income.currency === 'USD' && (
                              <Typography variant="caption" color="text.secondary">
                                ${income.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}/month @ ₹{exchangeRate}
                              </Typography>
                            )}
                          </Box>
                        ) : income.preTaxAmount ? (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              Gross: {formatCurrency(income.preTaxAmount)}
                            </Typography>
                            {income.taxPaid && income.taxPaid > 0 && (
                              <Typography variant="caption" sx={{ color: categoryColors.tax }}>
                                Tax: -{formatCurrency(income.taxPaid)}
                              </Typography>
                            )}
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              Net: {formatCurrency(income.amount)}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {formatCurrency(income.amount)}/month
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            {/* Tax Summary */}
            {totalTaxPaid > 0 && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: `${categoryColors.tax}15`, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Monthly Tax
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: categoryColors.tax }}>
                    {formatCurrency(totalTaxPaid)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Effective tax rate: {((totalTaxPaid / totalGrossIncome) * 100).toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick Stats
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary">Effective Tax Rate</Typography>
                <Typography fontWeight={600} sx={{ color: categoryColors.tax }}>
                  {totalGrossIncome > 0 ? ((totalTaxPaid / totalGrossIncome) * 100).toFixed(1) : 0}%
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary">Savings Rate (of Net)</Typography>
                <Typography fontWeight={600} color="success.main">
                  {summary.totalIncome > 0 ? ((summary.remaining / summary.totalIncome) * 100).toFixed(1) : 0}%
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary">Investment Rate (of Net)</Typography>
                <Typography fontWeight={600} color="info.main">
                  {summary.totalIncome > 0
                    ? (((summary.totalSIPs + summary.totalVoluntaryInvestments) / summary.totalIncome) * 100).toFixed(1)
                    : 0}%
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary">Income Sources</Typography>
                <Typography fontWeight={600}>{data.incomes.length}</Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">Active Investments</Typography>
                <Typography fontWeight={600}>{data.investments.length}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Assets Summary */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Assets Portfolio
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Value (INR)</Typography>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  {formatCurrency(summary.totalAssetValueINR)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Value (USD)</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatCurrency(summary.totalAssetValueUSD, 'USD')}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {data.assets.length} assets tracked
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
