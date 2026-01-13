import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  ButtonGroup,
} from '@mui/material';
import { Add, TrendingUp } from '@mui/icons-material';
import IncomeList from '../components/income/IncomeList';
import IncomeForm from '../components/income/IncomeForm';
import RSUVestingForm from '../components/income/RSUVestingForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { incomeService } from '../services/incomeService';
import { settingsService } from '../services/settingsService';
import type { Income as IncomeType } from '../types';
import { formatCurrency } from '../utils/formatters';

const Income: React.FC = () => {
  const [incomes, setIncomes] = useState<IncomeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rsuFormOpen, setRsuFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingIncome, setDeletingIncome] = useState<IncomeType | null>(null);
  const [saving, setSaving] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(89);

  useEffect(() => {
    loadIncomes();
    loadSettings();
  }, []);

  const loadIncomes = async () => {
    try {
      setLoading(true);
      const data = await incomeService.getAll();
      setIncomes(data);
      setError(null);
    } catch (err) {
      setError('Failed to load income sources');
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

  const handleAdd = () => {
    setEditingIncome(null);
    setFormOpen(true);
  };

  const handleAddRSUVesting = () => {
    setEditingIncome(null);
    setRsuFormOpen(true);
  };

  const handleEdit = (income: IncomeType) => {
    setEditingIncome(income);
    if (income.type === 'rsu_vesting') {
      setRsuFormOpen(true);
    } else {
      setFormOpen(true);
    }
  };

  const handleDelete = (income: IncomeType) => {
    setDeletingIncome(income);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: Partial<IncomeType>) => {
    try {
      setSaving(true);
      if (editingIncome) {
        await incomeService.update(editingIncome._id, data);
      } else {
        await incomeService.create(data);
      }
      setFormOpen(false);
      setRsuFormOpen(false);
      loadIncomes();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingIncome) return;
    try {
      await incomeService.delete(deletingIncome._id);
      setDeleteDialogOpen(false);
      setDeletingIncome(null);
      loadIncomes();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to get income amount in INR (RSU may be stored in USD)
  const getIncomeINR = (income: IncomeType) => {
    if (income.type === 'rsu_vesting' && income.currency === 'USD') {
      return income.amount * exchangeRate;
    }
    return income.amount;
  };

  // Calculate totals
  const totalIncome = incomes.reduce((sum, inc) => sum + getIncomeINR(inc), 0);
  const totalTaxPaid = incomes.reduce((sum, inc) => sum + (inc.taxPaid || 0), 0);
  const totalGrossIncome = incomes.reduce((sum, inc) => {
    if (inc.type === 'rsu_vesting') {
      return sum + getIncomeINR(inc); // RSU has no pre-tax concept
    }
    return sum + (inc.preTaxAmount || inc.amount);
  }, 0);
  const rsuVestingIncome = incomes
    .filter(inc => inc.type === 'rsu_vesting')
    .reduce((sum, inc) => sum + getIncomeINR(inc), 0);

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
            Income Sources
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your monthly income sources
          </Typography>
        </Box>
        <ButtonGroup variant="contained">
          <Button startIcon={<Add />} onClick={handleAdd}>
            Add Income
          </Button>
          <Button startIcon={<TrendingUp />} onClick={handleAddRSUVesting} color="info">
            Add RSU Vesting
          </Button>
        </ButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, backgroundColor: 'success.light' }}>
            <Typography variant="body2" color="success.contrastText">
              Total Net Income
            </Typography>
            <Typography variant="h5" fontWeight={700} color="success.contrastText">
              {formatCurrency(totalIncome)}
            </Typography>
            <Typography variant="caption" color="success.contrastText">
              Monthly take-home
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, backgroundColor: 'grey.200' }}>
            <Typography variant="body2" color="text.secondary">
              Total Gross Income
            </Typography>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              {formatCurrency(totalGrossIncome)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Before tax
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, backgroundColor: 'error.light' }}>
            <Typography variant="body2" color="error.contrastText">
              Monthly Tax Paid
            </Typography>
            <Typography variant="h5" fontWeight={700} color="error.contrastText">
              {formatCurrency(totalTaxPaid)}
            </Typography>
            <Typography variant="caption" color="error.contrastText">
              {totalGrossIncome > 0 ? `${((totalTaxPaid / totalGrossIncome) * 100).toFixed(1)}% effective rate` : '0%'}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, backgroundColor: 'info.light' }}>
            <Typography variant="body2" color="info.contrastText">
              RSU Vesting Income
            </Typography>
            <Typography variant="h5" fontWeight={700} color="info.contrastText">
              {formatCurrency(rsuVestingIncome)}
            </Typography>
            <Typography variant="caption" color="info.contrastText">
              Monthly equity
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <IncomeList
        incomes={incomes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        exchangeRate={exchangeRate}
      />

      <IncomeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingIncome}
        loading={saving}
      />

      <RSUVestingForm
        open={rsuFormOpen}
        onClose={() => setRsuFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingIncome}
        loading={saving}
        exchangeRate={exchangeRate}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Income Source"
        message={`Are you sure you want to delete "${deletingIncome?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </Box>
  );
};

export default Income;
