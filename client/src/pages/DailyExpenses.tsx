import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
} from '@mui/material';
import { Add, Email, ExpandMore } from '@mui/icons-material';
import DailyExpenseList from '../components/daily-expenses/DailyExpenseList';
import DailyExpenseForm from '../components/daily-expenses/DailyExpenseForm';
import DateRangeFilter from '../components/daily-expenses/DateRangeFilter';
import WeeklyAnalyticsCharts from '../components/daily-expenses/WeeklyAnalyticsCharts';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { SkeletonDailyExpenses } from '../components/common/Skeletons';
import { dailyExpenseService } from '../services/dailyExpenseService';
import type { DailyExpenseFilters } from '../services/dailyExpenseService';
import type { DailyExpense, DailyExpenseSummary, WeeklyExpenseAnalytics } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

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
  const [search, setSearch] = useState('');

  // Email sending state
  const [sendingEmail, setSendingEmail] = useState(false);
  const { showToast } = useToast();

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
      if (search) filters.search = search;

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
  }, [startDate, endDate, categoryFilter, search]);

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
        showToast('Expense updated', 'success');
      } else {
        await dailyExpenseService.create(data);
        showToast('Expense added', 'success');
      }
      setFormOpen(false);
      loadExpenses(1, false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save expense', 'error');
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
      showToast('Expense deleted', 'success');
      loadExpenses(1, false);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete expense', 'error');
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
    setSearch('');
  };

  const handleSendWeeklySummary = async () => {
    try {
      setSendingEmail(true);
      const response = await dailyExpenseService.sendWeeklySummary();
      showToast(`Weekly summary sent to ${response.sentTo}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to send weekly summary email', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading && expenses.length === 0) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Daily Spending
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your day-to-day spending
          </Typography>
        </Box>
        <SkeletonDailyExpenses />
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
        search={search}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onCategoryChange={setCategoryFilter}
        onSearchChange={setSearch}
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
    </Box>
  );
};

export default DailyExpenses;
