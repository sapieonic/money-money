import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import ExpenseList from '../components/expenses/ExpenseList';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { expenseService } from '../services/expenseService';
import type { Expense as ExpenseType } from '../types';
import { formatCurrency } from '../utils/formatters';

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getAll();
      setExpenses(data);
      setError(null);
    } catch (err) {
      setError('Failed to load expenses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const handleEdit = (expense: ExpenseType) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = (expense: ExpenseType) => {
    setDeletingExpense(expense);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: Partial<ExpenseType>) => {
    try {
      setSaving(true);
      if (editingExpense) {
        await expenseService.update(editingExpense._id, data);
      } else {
        await expenseService.create(data);
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
      await expenseService.delete(deletingExpense._id);
      setDeleteDialogOpen(false);
      setDeletingExpense(null);
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
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
            Fixed Expenses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your monthly recurring expenses
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Add Expense
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'error.light' }}>
        <Typography variant="body2" color="error.contrastText">
          Total Monthly Expenses
        </Typography>
        <Typography variant="h4" fontWeight={700} color="error.contrastText">
          {formatCurrency(totalExpenses)}
        </Typography>
      </Paper>

      <ExpenseList
        expenses={expenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingExpense}
        loading={saving}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deletingExpense?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </Box>
  );
};

export default Expenses;
