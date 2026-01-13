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
} from '@mui/material';
import type { Asset, AssetCategory } from '../../types';

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Asset>) => void;
  initialData?: Asset | null;
  loading?: boolean;
  exchangeRate?: number;
}

const assetCategories: { value: AssetCategory; label: string }[] = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'fd', label: 'Fixed Deposit' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'rsu', label: 'RSU (Restricted Stock Units)' },
  { value: 'other', label: 'Other' },
];

const AssetForm: React.FC<AssetFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  exchangeRate = 89,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('other');
  const [quantity, setQuantity] = useState('');
  const [currentValueINR, setCurrentValueINR] = useState('');
  const [currentValueUSD, setCurrentValueUSD] = useState('');
  const [platform, setPlatform] = useState('');
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setQuantity(initialData.quantity?.toString() || '');
      setCurrentValueINR(initialData.currentValueINR.toString());
      setCurrentValueUSD(initialData.currentValueUSD?.toString() || '');
      setPlatform(initialData.platform);
      setCurrency(initialData.currency);
    } else {
      setName('');
      setCategory('other');
      setQuantity('');
      setCurrentValueINR('');
      setCurrentValueUSD('');
      setPlatform('');
      setCurrency('INR');
    }
  }, [initialData, open]);

  const handleINRChange = (value: string) => {
    setCurrentValueINR(value);
    if (value && currency === 'USD') {
      setCurrentValueUSD((parseFloat(value) / exchangeRate).toFixed(2));
    }
  };

  const handleUSDChange = (value: string) => {
    setCurrentValueUSD(value);
    if (value) {
      setCurrentValueINR((parseFloat(value) * exchangeRate).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      quantity: quantity ? parseFloat(quantity) : 0,
      currentValueINR: parseFloat(currentValueINR),
      currentValueUSD: currentValueUSD ? parseFloat(currentValueUSD) : 0,
      platform,
      currency,
    });
  };

  const isValid = name.trim() && currentValueINR && parseFloat(currentValueINR) > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Asset' : 'Add Asset'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., UiPath Stocks"
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={category}
                    label="Category"
                    onChange={(e) => setCategory(e.target.value as AssetCategory)}
                  >
                    {assetCategories.map((c) => (
                      <MenuItem key={c.value} value={c.value}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Primary Currency</InputLabel>
                  <Select
                    value={currency}
                    label="Primary Currency"
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <MenuItem value="INR">INR</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label="Quantity/Units"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              fullWidth
              placeholder="Optional"
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Value (INR)"
                  value={currentValueINR}
                  onChange={(e) => handleINRChange(e.target.value)}
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
                  value={currentValueUSD}
                  onChange={(e) => handleUSDChange(e.target.value)}
                  type="number"
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText={`Rate: 1 USD = ₹${exchangeRate}`}
                />
              </Grid>
            </Grid>
            <TextField
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              fullWidth
              placeholder="e.g., Zerodha, Coinbase"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || loading}
          >
            {loading ? 'Saving...' : initialData ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssetForm;
