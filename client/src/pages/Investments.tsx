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
  Grid,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import InvestmentList from '../components/investments/InvestmentList';
import InvestmentForm from '../components/investments/InvestmentForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { investmentService } from '../services/investmentService';
import type { Investment, InvestmentStatus, InvestmentType } from '../types';
import { formatCurrency } from '../utils/formatters';

const Investments: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [defaultType, setDefaultType] = useState<InvestmentType>('sip');

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const data = await investmentService.getAll();
      setInvestments(data);
      setError(null);
    } catch (err) {
      setError('Failed to load investments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (type: InvestmentType) => {
    setDefaultType(type);
    setEditingInvestment(null);
    setFormOpen(true);
  };

  const handleEdit = (investment: Investment) => {
    setDefaultType(investment.type);
    setEditingInvestment(investment);
    setFormOpen(true);
  };

  const handleDelete = (investment: Investment) => {
    setDeletingInvestment(investment);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (investment: Investment, newStatus: InvestmentStatus) => {
    try {
      await investmentService.toggleStatus(investment._id, newStatus);
      loadInvestments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (data: Partial<Investment>) => {
    try {
      setSaving(true);
      if (editingInvestment) {
        await investmentService.update(editingInvestment._id, data);
      } else {
        await investmentService.create(data);
      }
      setFormOpen(false);
      loadInvestments();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingInvestment) return;
    try {
      await investmentService.delete(deletingInvestment._id);
      setDeleteDialogOpen(false);
      setDeletingInvestment(null);
      loadInvestments();
    } catch (err) {
      console.error(err);
    }
  };

  const sips = investments.filter((inv) => inv.type === 'sip');
  const voluntary = investments.filter((inv) => inv.type === 'voluntary');

  const activeSIPs = sips.filter((inv) => inv.status === 'active');
  const activeVoluntary = voluntary.filter((inv) => inv.status === 'active');

  const totalSIPs = activeSIPs.reduce((sum, inv) => sum + inv.amount, 0);
  const totalVoluntary = activeVoluntary.reduce((sum, inv) => sum + inv.amount, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Investments
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your SIPs and voluntary investments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper sx={{ p: 2, backgroundColor: 'info.light' }}>
            <Typography variant="body2" color="info.contrastText">
              Total Active SIPs
            </Typography>
            <Typography variant="h4" fontWeight={700} color="info.contrastText">
              {formatCurrency(totalSIPs)}/mo
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper sx={{ p: 2, backgroundColor: 'secondary.light' }}>
            <Typography variant="body2" color="secondary.contrastText">
              Total Voluntary
            </Typography>
            <Typography variant="h4" fontWeight={700} color="secondary.contrastText">
              {formatCurrency(totalVoluntary)}/mo
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`SIPs (${sips.length})`} />
          <Tab label={`Voluntary (${voluntary.length})`} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAdd('sip')}
            >
              Add SIP
            </Button>
          </Box>
          <InvestmentList
            investments={sips}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAdd('voluntary')}
            >
              Add Investment
            </Button>
          </Box>
          <InvestmentList
            investments={voluntary}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        </Box>
      )}

      <InvestmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingInvestment}
        loading={saving}
        defaultType={defaultType}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Investment"
        message={`Are you sure you want to delete "${deletingInvestment?.name}"? This will stop the investment.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </Box>
  );
};

export default Investments;
