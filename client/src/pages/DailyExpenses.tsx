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
import { Add } from '@mui/icons-material';
import DailyExpenseList from '../components/daily-expenses/DailyExpenseList';
import DailyExpenseForm from '../components/daily-expenses/DailyExpenseForm';
import DateRangeFilter from '../components/daily-expenses/DateRangeFilter';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { dailyExpenseService } from '../services/dailyExpenseService';
import type { DailyExpenseFilters } from '../services/dailyExpenseService';
import type { DailyExpense, DailyExpenseSummary } from '../types';
import { formatCurrency } from '../utils/formatters';

const DailyExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [summary, setSummary] = useState<DailyExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const filters: DailyExpenseFilters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (categoryFilter) filters.category = categoryFilter;

      const [expensesData, summaryData] = await Promise.all([
        dailyExpenseService.getAll(filters),
        dailyExpenseService.getSummary(),
      ]);

      setExpenses(expensesData);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError('Failed to load daily expenses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryFilter]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

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
      loadExpenses();
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
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
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
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Daily Expenses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your day-to-day spending
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          Add Expense
        </Button>
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
                Filtered Total
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
