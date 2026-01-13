import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  ButtonGroup,
} from '@mui/material';
import { Add, AccountBalance } from '@mui/icons-material';
import AssetList from '../components/assets/AssetList';
import AssetForm from '../components/assets/AssetForm';
import RSUForm from '../components/assets/RSUForm';
import AssetValueHistory from '../components/assets/AssetValueHistory';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { assetService } from '../services/assetService';
import { settingsService } from '../services/settingsService';
import type { Asset } from '../types';
import { formatCurrency } from '../utils/formatters';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rsuFormOpen, setRsuFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [updatingAsset, setUpdatingAsset] = useState<Asset | null>(null);
  const [newValueINR, setNewValueINR] = useState('');
  const [newValueUSD, setNewValueUSD] = useState('');
  const [saving, setSaving] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(89);

  useEffect(() => {
    loadAssets();
    loadSettings();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await assetService.getAll();
      setAssets(data);
      setError(null);
    } catch (err) {
      setError('Failed to load assets');
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
    setEditingAsset(null);
    setFormOpen(true);
  };

  const handleAddRSU = () => {
    setEditingAsset(null);
    setRsuFormOpen(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    if (asset.category === 'rsu') {
      setRsuFormOpen(true);
    } else {
      setFormOpen(true);
    }
  };

  const handleDelete = (asset: Asset) => {
    setDeletingAsset(asset);
    setDeleteDialogOpen(true);
  };

  const handleUpdateValue = (asset: Asset) => {
    setUpdatingAsset(asset);
    setNewValueINR(asset.currentValueINR.toString());
    setNewValueUSD(asset.currentValueUSD?.toString() || '');
    setValueDialogOpen(true);
  };

  const handleViewHistory = (asset: Asset) => {
    setHistoryAsset(asset);
  };

  const handleSubmit = async (data: Partial<Asset>) => {
    try {
      setSaving(true);
      if (editingAsset) {
        await assetService.update(editingAsset._id, data);
      } else {
        await assetService.create(data);
      }
      setFormOpen(false);
      setRsuFormOpen(false);
      loadAssets();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAsset) return;
    try {
      await assetService.delete(deletingAsset._id);
      setDeleteDialogOpen(false);
      setDeletingAsset(null);
      loadAssets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveValue = async () => {
    if (!updatingAsset) return;
    try {
      setSaving(true);
      await assetService.updateValue(
        updatingAsset._id,
        parseFloat(newValueINR),
        newValueUSD ? parseFloat(newValueUSD) : undefined
      );
      setValueDialogOpen(false);
      setUpdatingAsset(null);
      loadAssets();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalINR = assets.reduce((sum, asset) => sum + asset.currentValueINR, 0);
  const totalUSD = assets.reduce((sum, asset) => sum + (asset.currentValueUSD || 0), 0);

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
            Assets Portfolio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your investments and their current values
          </Typography>
        </Box>
        <ButtonGroup variant="contained">
          <Button startIcon={<Add />} onClick={handleAdd}>
            Add Asset
          </Button>
          <Button startIcon={<AccountBalance />} onClick={handleAddRSU} color="info">
            Add RSU
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
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper sx={{ p: 2, backgroundColor: 'warning.light' }}>
            <Typography variant="body2" color="warning.contrastText">
              Total Value (INR)
            </Typography>
            <Typography variant="h4" fontWeight={700} color="warning.contrastText">
              {formatCurrency(totalINR)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper sx={{ p: 2, backgroundColor: 'primary.light' }}>
            <Typography variant="body2" color="primary.contrastText">
              Total Value (USD)
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary.contrastText">
              {formatCurrency(totalUSD, 'USD')}
            </Typography>
            <Typography variant="caption" color="primary.contrastText">
              Exchange Rate: 1 USD = ₹{exchangeRate}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <AssetList
        assets={assets}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUpdateValue={handleUpdateValue}
        onViewHistory={handleViewHistory}
      />

      <AssetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingAsset}
        loading={saving}
        exchangeRate={exchangeRate}
      />

      <RSUForm
        open={rsuFormOpen}
        onClose={() => setRsuFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingAsset}
        loading={saving}
        exchangeRate={exchangeRate}
      />

      <AssetValueHistory
        open={!!historyAsset}
        onClose={() => setHistoryAsset(null)}
        asset={historyAsset}
      />

      {/* Update Value Dialog */}
      <Dialog
        open={valueDialogOpen}
        onClose={() => setValueDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Value - {updatingAsset?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Value (INR)"
                value={newValueINR}
                onChange={(e) => setNewValueINR(e.target.value)}
                type="number"
                fullWidth
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Value (USD)"
                value={newValueUSD}
                onChange={(e) => setNewValueUSD(e.target.value)}
                type="number"
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setValueDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveValue}
            variant="contained"
            disabled={!newValueINR || saving}
          >
            {saving ? 'Saving...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Asset"
        message={`Are you sure you want to delete "${deletingAsset?.name}"?`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </Box>
  );
};

export default Assets;
