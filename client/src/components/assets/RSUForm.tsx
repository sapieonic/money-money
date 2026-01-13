import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Box,
  Grid,
  Typography,
  Paper,
} from '@mui/material';
import type { Asset } from '../../types';

interface RSUFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Asset>) => void;
  initialData?: Asset | null;
  loading?: boolean;
  exchangeRate?: number;
}

const RSUForm: React.FC<RSUFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  exchangeRate = 89,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [units, setUnits] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    if (initialData && initialData.category === 'rsu') {
      setCompanyName(initialData.name.replace(' RSUs', ''));
      setUnits(initialData.quantity?.toString() || '');
      setUnitPrice(initialData.unitPrice?.toString() || '');
      setCurrency(initialData.currency || 'USD');
      setPlatform(initialData.platform || '');
    } else {
      setCompanyName('');
      setUnits('');
      setUnitPrice('');
      setCurrency('USD');
      setPlatform('');
    }
  }, [initialData, open]);

  const calculateTotalValue = () => {
    const unitsNum = parseFloat(units) || 0;
    const priceNum = parseFloat(unitPrice) || 0;
    return unitsNum * priceNum;
  };

  const getTotalINR = () => {
    const total = calculateTotalValue();
    if (currency === 'USD') {
      return total * exchangeRate;
    }
    return total;
  };

  const getTotalUSD = () => {
    const total = calculateTotalValue();
    if (currency === 'INR') {
      return total / exchangeRate;
    }
    return total;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: `${companyName} RSUs`,
      category: 'rsu',
      quantity: parseFloat(units),
      unitPrice: parseFloat(unitPrice),
      currentValueINR: getTotalINR(),
      currentValueUSD: getTotalUSD(),
      platform,
      currency,
    });
  };

  const isValid = companyName.trim() && units && parseFloat(units) > 0 && unitPrice && parseFloat(unitPrice) > 0;
  const totalValue = calculateTotalValue();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit RSU' : 'Add RSU (Restricted Stock Units)'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., UiPath, Google, Microsoft"
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Number of Units"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  type="number"
                  fullWidth
                  required
                  placeholder="150"
                  inputProps={{ min: 0, step: 'any' }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={currency}
                    label="Currency"
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="INR">INR (₹)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Unit Price (Stock Price)"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              type="number"
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {currency === 'USD' ? '$' : '₹'}
                  </InputAdornment>
                ),
              }}
              placeholder="0.00"
              inputProps={{ min: 0, step: '0.01' }}
            />

            <TextField
              label="Platform / Broker"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              fullWidth
              placeholder="e.g., Schwab, E*TRADE, Morgan Stanley"
            />

            {/* Calculated Value Preview */}
            {totalValue > 0 && (
              <Paper sx={{ p: 2, backgroundColor: 'success.light' }}>
                <Typography variant="body2" color="success.contrastText" gutterBottom>
                  Calculated Total Value
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="h6" fontWeight={700} color="success.contrastText">
                      {currency === 'USD' ? '$' : '₹'}
                      {totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="success.contrastText">
                      {currency}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="h6" fontWeight={700} color="success.contrastText">
                      {currency === 'USD' ? '₹' : '$'}
                      {(currency === 'USD' ? getTotalINR() : getTotalUSD()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="success.contrastText">
                      {currency === 'USD' ? 'INR' : 'USD'} (@ {exchangeRate})
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={!isValid || loading}
          >
            {loading ? 'Saving...' : initialData ? 'Update RSU' : 'Add RSU'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RSUForm;
