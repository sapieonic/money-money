import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  AccountBalanceWallet,
  CreditCard,
  Money,
  Receipt,
  Savings,
  ShoppingCart,
  TrendingUp,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import SummaryCard from '../components/common/SummaryCard';
import StatCard from '../components/dashboard/StatCard';
import HeroHeader from '../components/dashboard/HeroHeader';
import TrendChart from '../components/dashboard/TrendChart';
import SpendProjectionCard from '../components/dashboard/SpendProjectionCard';
import AllocationBar from '../components/dashboard/AllocationBar';
import UpcomingPanel from '../components/dashboard/UpcomingPanel';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import { dashboardService } from '../services/dashboardService';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import type { Income } from '../types';
import { formatCompactNumber, formatCurrency } from '../utils/formatters';
import { categoryColors } from '../theme/theme';

const incomeTypeColors: Record<string, string> = {
  salary: '#4caf50',
  freelance: '#2196f3',
  dividend: '#9c27b0',
  rental: '#ff9800',
  rsu_vesting: '#00bcd4',
  other: '#607d8b',
};

const pctChange = (current: number, previous: number): number | undefined => {
  if (!previous || !Number.isFinite(previous)) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const compactINR = (amount: number) =>
  `${amount < 0 ? '-' : ''}₹${formatCompactNumber(Math.abs(amount))}`;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data,
    isLoading: dashboardLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboard,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => dashboardService.getSnapshots(12),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
  });

  const exchangeRate = settings?.exchangeRates?.USD || 89;

  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load dashboard data
      </Alert>
    );
  }

  const { summary } = data;

  // Tolerate responses from a backend that predates the debt/net-worth fields.
  const debts = data.debts ?? [];
  const totalDebt = summary.totalDebt ?? 0;
  const monthlyDebtPayment = summary.monthlyDebtPayment ?? 0;
  const netWorth = summary.netWorth ?? summary.totalAssetValueINR - totalDebt;

  // RSU income may be stored in USD; convert to INR for totals.
  const getIncomeINR = (income: Income) => {
    if (income.type === 'rsu_vesting' && income.currency === 'USD') {
      return income.amount * exchangeRate;
    }
    return income.amount;
  };

  const totalTaxPaid = data.incomes.reduce((sum, inc) => sum + (inc.taxPaid || 0), 0);
  const totalGrossIncome = data.incomes.reduce((sum, inc) => {
    if (inc.type === 'rsu_vesting') {
      return sum + getIncomeINR(inc);
    }
    return sum + (inc.preTaxAmount || inc.amount);
  }, 0);

  const totalInvested = summary.totalSIPs + summary.totalVoluntaryInvestments;
  const savingsRate = summary.totalIncome > 0 ? (summary.remaining / summary.totalIncome) * 100 : 0;
  const investmentRate = summary.totalIncome > 0 ? (totalInvested / summary.totalIncome) * 100 : 0;
  const effectiveTaxRate = totalGrossIncome > 0 ? (totalTaxPaid / totalGrossIncome) * 100 : 0;

  // Month progress for the hero progress bar.
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthProgress = today.getDate() / daysInMonth;

  // Snapshot-derived deltas and sparkline (snapshots arrive newest-first).
  // If the newest snapshot is for the current month, compare against the one before it.
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const baselineSnap = snapshots[0]?.month === currentMonthKey ? snapshots[1] : snapshots[0];
  const assetSparkline = [...snapshots]
    .reverse()
    .map((s) => s.totalAssetValue)
    .concat(summary.totalAssetValueINR);
  const netWorthDelta = baselineSnap
    ? pctChange(summary.totalAssetValueINR, baselineSnap.totalAssetValue)
    : undefined;
  const savedDelta = baselineSnap ? pctChange(summary.remaining, baselineSnap.remaining) : undefined;
  const investedDelta = baselineSnap
    ? pctChange(totalInvested, baselineSnap.totalSIPs + baselineSnap.totalVoluntaryInvestments)
    : undefined;

  const allocationData = [
    { name: 'Tax', value: totalTaxPaid, color: categoryColors.tax },
    { name: 'Expenses', value: summary.totalExpenses, color: categoryColors.expenses },
    { name: 'Daily', value: summary.dailyExpensesThisMonth || 0, color: '#ef5350' },
    { name: 'SIPs', value: summary.totalSIPs, color: categoryColors.sip },
    { name: 'Investments', value: summary.totalVoluntaryInvestments, color: categoryColors.voluntary },
    { name: 'Remaining', value: Math.max(summary.remaining, 0), color: categoryColors.remaining },
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

  const hasDebt = totalDebt > 0;
  const firstName = (user?.displayName || user?.email || 'there').split(' ')[0].split('@')[0];

  return (
    <Box>
      <HeroHeader
        displayName={firstName}
        remaining={summary.remaining}
        savingsRate={savingsRate}
        monthProgress={monthProgress}
      />

      {/* Headline stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Net Worth"
            value={compactINR(netWorth)}
            color={categoryColors.assets}
            icon={<AccountBalanceWallet fontSize="small" />}
            delta={netWorthDelta}
            subtitle={hasDebt ? `after ${compactINR(totalDebt)} debt` : `${data.assets.length} assets`}
            sparkline={assetSparkline}
            onClick={() => navigate('/assets')}
            index={0}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Saved This Month"
            value={compactINR(summary.remaining)}
            color={categoryColors.remaining}
            icon={<Savings fontSize="small" />}
            delta={savedDelta}
            subtitle={`${savingsRate.toFixed(0)}% of net income`}
            index={1}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Invested / Month"
            value={compactINR(totalInvested)}
            color={categoryColors.sip}
            icon={<TrendingUp fontSize="small" />}
            delta={investedDelta}
            subtitle="SIPs + voluntary"
            onClick={() => navigate('/investments')}
            index={2}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          {hasDebt ? (
            <StatCard
              title="Debt Outstanding"
              value={compactINR(totalDebt)}
              color={categoryColors.expenses}
              icon={<CreditCard fontSize="small" />}
              subtitle={`${compactINR(monthlyDebtPayment)}/mo`}
              onClick={() => navigate('/debts')}
              index={3}
            />
          ) : (
            <StatCard
              title="Net Income"
              value={compactINR(summary.totalIncome)}
              color={categoryColors.income}
              icon={<Money fontSize="small" />}
              subtitle="after tax, monthly"
              onClick={() => navigate('/income')}
              index={3}
            />
          )}
        </Grid>
      </Grid>

      {/* Secondary quieter stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard title="Gross Income" amount={totalGrossIncome} color={categoryColors.income} compact onClick={() => navigate('/income')} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard title="Tax Paid" amount={totalTaxPaid} color={categoryColors.tax} icon={<Money />} compact />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard title="Fixed Expenses" amount={summary.totalExpenses} color={categoryColors.expenses} icon={<Receipt />} compact onClick={() => navigate('/expenses')} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard
            title="Daily Spend"
            amount={summary.dailyExpensesThisMonth || 0}
            color="#ef5350"
            icon={<ShoppingCart />}
            compact
            subtitle={`${compactINR(summary.dailyExpensesToday || 0)} today`}
            onClick={() => navigate('/daily-expenses')}
          />
        </Grid>
      </Grid>

      {/* Trend + upcoming */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <TrendChart snapshots={snapshots} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <UpcomingPanel expenses={data.expenses} debts={debts} />
        </Grid>
      </Grid>

      {/* Year-end spend projection */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12 }}>
          <SpendProjectionCard />
        </Grid>
      </Grid>

      {/* Allocation + income sources */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <AllocationBar
            title="Where Your Income Goes"
            subtitle={`How your gross income of ${formatCurrency(totalGrossIncome)} is distributed each month`}
            data={allocationData}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: '100%', maxHeight: 420, overflow: 'auto' }}>
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
                  sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
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
                    secondaryTypographyProps={{ component: 'div' }}
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
          </Paper>
        </Grid>
      </Grid>

      {/* Quick stats + assets & debt */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick Stats
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[
                { label: 'Effective Tax Rate', value: `${effectiveTaxRate.toFixed(1)}%`, color: categoryColors.tax },
                { label: 'Savings Rate (of Net)', value: `${savingsRate.toFixed(1)}%`, color: 'success.main' },
                { label: 'Investment Rate (of Net)', value: `${investmentRate.toFixed(1)}%`, color: 'info.main' },
                { label: 'Income Sources', value: `${data.incomes.length}`, color: 'text.primary' },
                { label: 'Active Investments', value: `${data.investments.length}`, color: 'text.primary' },
              ].map((row, idx, arr) => (
                <Box
                  key={row.label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1.5,
                    borderBottom: idx < arr.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                  <Typography fontWeight={600} sx={{ color: row.color }}>{row.value}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Assets & Net Worth
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Assets (INR)</Typography>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  {formatCurrency(summary.totalAssetValueINR)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Assets (USD)</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatCurrency(summary.totalAssetValueUSD, 'USD')}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                backgroundColor: (theme) =>
                  netWorth >= 0 ? `${theme.palette.success.main}12` : `${theme.palette.error.main}12`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Net Worth</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.assets.length} assets
                    {totalDebt > 0 ? ` · ${formatCurrency(totalDebt)} debt` : ''}
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color={netWorth >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(netWorth)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
