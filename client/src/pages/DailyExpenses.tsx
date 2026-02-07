import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Snackbar,
} from '@mui/material';
import { Add, Email, ExpandMore } from '@mui/icons-material';
import DailyExpenseList from '../components/daily-expenses/DailyExpenseList';
import DailyExpenseForm from '../components/daily-expenses/DailyExpenseForm';
import DateRangeFilter from '../components/daily-expenses/DateRangeFilter';
import WeeklyAnalyticsCharts from '../components/daily-expenses/WeeklyAnalyticsCharts';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { dailyExpenseService } from '../services/dailyExpenseService';
import type { DailyExpenseFilters } from '../services/dailyExpenseService';
import type { DailyExpense, DailyExpenseSummary, WeeklyExpenseAnalytics } from '../types';
import { formatCurrency } from '../utils/formatters';

const PAGE_SIZE = 50;

const DailyExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<DailyExpenseSummary | null>(null);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<WeeklyExpenseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<DailyExpense | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Email sending state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadExpenses = useCallback(async (loadPage = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const filters: DailyExpenseFilters = {
        page: loadPage,
        limit: PAGE_SIZE,
      };
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (categoryFilter) filters.category = categoryFilter;

      const requests: [ReturnType<typeof dailyExpenseService.getAll>, ...Promise<unknown>[]] = [
        dailyExpenseService.getAll(filters),
      ];

      // Only load summary and analytics on initial load (not on "load more")
      if (!append) {
        requests.push(
          dailyExpenseService.getSummary(),
          dailyExpenseService.getWeeklyAnalytics(),
        );
      }

      const results = await Promise.all(requests);
      const expensesData = results[0] as Awaited<ReturnType<typeof dailyExpenseService.getAll>>;

      if (append) {
        setExpenses((prev) => [...prev, ...expensesData.items]);
      } else {
        setExpenses(expensesData.items);
        setSummary(results[1] as DailyExpenseSummary);
        setWeeklyAnalytics(results[2] as WeeklyExpenseAnalytics);
      }

      setTotalCount(expensesData.total);
      setHasMore(expensesData.hasMore);
      setPage(loadPage);
      setError(null);
    } catch (err) {
      setError('Failed to load daily expenses');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [startDate, endDate, categoryFilter]);

  useEffect(() => {
    loadExpenses(1, false);
  }, [loadExpenses]);

  const handleLoadMore = () => {
    loadExpenses(page + 1, true);
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const handleEdit = (expense: DailyExpense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = (expense: DailyExpense) => {
    setDeletingExpense(expense);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: Partial<DailyExpense>) => {
    try {
      setSaving(true);
      if (editingExpense) {
        await dailyExpenseService.update(editingExpense._id, data);
      } else {
        await dailyExpenseService.create(data);
      }
      setFormOpen(false);
      loadExpenses(1, false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    try {
      await dailyExpenseService.delete(deletingExpense._id);
      setDeleteDialogOpen(false);
      setDeletingExpense(null);
      loadExpenses(1, false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
  };

  const handleSendWeeklySummary = async () => {
    try {
      setSendingEmail(true);
      const response = await dailyExpenseService.sendWeeklySummary();
      setSnackbar({
        open: true,
        message: `Weekly summary sent to ${response.sentTo}`,
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: 'Failed to send weekly summary email',
        severity: 'error',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const filteredTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading && expenses.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Daily Spending
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your day-to-day spending
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={sendingEmail ? <CircularProgress size={16} /> : <Email />}
            onClick={handleSendWeeklySummary}
            disabled={sendingEmail || !weeklyAnalytics || weeklyAnalytics.transactionCount === 0}
          >
            {sendingEmail ? 'Sending...' : 'Email Weekly Summary'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Paper sx={{ p: 2, backgroundColor: 'warning.light' }}>
              <Typography variant="body2" color="warning.contrastText">
                Today
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                color="warning.contrastText"
              >
                {formatCurrency(summary.today)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Paper sx={{ p: 2, backgroundColor: 'error.light' }}>
              <Typography variant="body2" color="error.contrastText">
                This Month
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                color="error.contrastText"
              >
                {formatCurrency(summary.thisMonth)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2, backgroundColor: 'info.light' }}>
              <Typography variant="body2" color="info.contrastText">
                Filtered Total ({expenses.length} of {totalCount})
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                color="info.contrastText"
              >
                {formatCurrency(filteredTotal)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Weekly Analytics Charts */}
      {weeklyAnalytics && <WeeklyAnalyticsCharts analytics={weeklyAnalytics} />}

      {/* Filters */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        category={categoryFilter}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onCategoryChange={setCategoryFilter}
        onClear={handleClearFilters}
      />

      {/* Expense List */}
      <DailyExpenseList
        expenses={expenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Load More */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : <ExpandMore />}
          >
            {loadingMore ? 'Loading...' : `Load More (${expenses.length} of ${totalCount})`}
          </Button>
        </Box>
      )}

      {/* Form Dialog */}
      <DailyExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingExpense}
        loading={saving}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Daily Expense"
        message={`Are you sure you want to delete "${deletingExpense?.description}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDestructive
      />

      {/* Snackbar for email notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DailyExpenses;
