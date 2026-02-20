import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import DebtTable from '../components/debts/DebtTable';
import DebtForm from '../components/debts/DebtForm';
import DebtDetailModal from '../components/debts/DebtDetailModal';
import SnowballPlanView from '../components/debts/SnowballPlanView';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { debtService } from '../services/debtService';
import type { Debt } from '../types';
import { formatCurrency } from '../utils/formatters';

const Debts: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingDebt, setViewingDebt] = useState<Debt | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      setLoading(true);
      const data = await debtService.getAll();
      setDebts(data);
      setError(null);
    } catch {
      setError('Failed to load debts');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDebt(null);
    setFormOpen(true);
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormOpen(true);
  };

  const handleDelete = (debt: Debt) => {
    setDeletingDebt(debt);
    setDeleteDialogOpen(true);
  };

  const handleView = (debt: Debt) => {
    setViewingDebt(debt);
    setDetailOpen(true);
  };

  const handleSubmit = async (data: Partial<Debt>) => {
    try {
      setSaving(true);
      if (editingDebt) {
        await debtService.update(editingDebt._id, data);
      } else {
        await debtService.create(data);
      }
      setFormOpen(false);
      loadDebts();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDebt) return;
    try {
      await debtService.delete(deletingDebt._id);
      setDeleteDialogOpen(false);
      setDeletingDebt(null);
      loadDebts();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentRecorded = () => {
    setDetailOpen(false);
    setViewingDebt(null);
    loadDebts();
  };

  const activeDebts = debts.filter((d) => d.status === 'active');
  const paidOffDebts = debts.filter((d) => d.status === 'paid_off');
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalMonthlyPayments = activeDebts.reduce(
    (sum, d) => sum + d.monthlyPayment + d.additionalPayment,
    0
  );

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
            Debts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage your loans and debt payoff strategy
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          Add Debt
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2, backgroundColor: '#e91e6320' }}>
          <Typography variant="caption" color="text.secondary">
            Total Debt
          </Typography>
          <Typography variant="h5" fontWeight={700} color="#e91e63">
            {formatCurrency(totalDebt)}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, backgroundColor: '#ff980020' }}>
          <Typography variant="caption" color="text.secondary">
            Monthly Payments
          </Typography>
          <Typography variant="h5" fontWeight={700} color="#ff9800">
            {formatCurrency(totalMonthlyPayments)}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, backgroundColor: '#2196f320' }}>
          <Typography variant="caption" color="text.secondary">
            Active Debts
          </Typography>
          <Typography variant="h5" fontWeight={700} color="#2196f3">
            {activeDebts.length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, backgroundColor: '#4caf5020' }}>
          <Typography variant="caption" color="text.secondary">
            Paid Off
          </Typography>
          <Typography variant="h5" fontWeight={700} color="#4caf50">
            {paidOffDebts.length}
          </Typography>
        </Paper>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="My Debts" />
        <Tab label="Payoff Strategy" />
      </Tabs>

      {tab === 0 && (
        <DebtTable
          debts={debts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      )}

      {tab === 1 && <SnowballPlanView />}

      <DebtForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingDebt}
        loading={saving}
      />

      <DebtDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setViewingDebt(null);
        }}
        debt={viewingDebt}
        onPaymentRecorded={handlePaymentRecorded}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Debt"
        message={`Are you sure you want to delete "${deletingDebt?.name}"? The linked expense will also be deactivated.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </Box>
  );
};

export default Debts;
