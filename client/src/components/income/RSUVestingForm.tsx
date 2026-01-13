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
  Alert,
} from '@mui/material';
import type { Income, VestPeriod } from '../../types';

interface RSUVestingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Income>) => void;
  initialData?: Income | null;
  loading?: boolean;
  exchangeRate?: number;
}

const vestPeriods: { value: VestPeriod; label: string; monthlyDivisor: number }[] = [
  { value: 'monthly', label: 'Monthly', monthlyDivisor: 1 },
  { value: 'quarterly', label: 'Quarterly', monthlyDivisor: 3 },
  { value: 'semi_annual', label: 'Semi-Annual (6 months)', monthlyDivisor: 6 },
  { value: 'annual', label: 'Annual', monthlyDivisor: 12 },
];

const RSUVestingForm: React.FC<RSUVestingFormProps> = ({
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
  const [vestPeriod, setVestPeriod] = useState<VestPeriod>('quarterly');

  useEffect(() => {
    if (initialData && initialData.type === 'rsu_vesting') {
      setCompanyName(initialData.name.replace(' RSU Vesting', ''));
      setUnits(initialData.units?.toString() || '');
      setUnitPrice(initialData.unitPrice?.toString() || '');
      setCurrency(initialData.currency || 'USD');
      setVestPeriod(initialData.vestPeriod || 'quarterly');
    } else {
      setCompanyName('');
      setUnits('');
      setUnitPrice('');
      setCurrency('USD');
      setVestPeriod('quarterly');
    }
  }, [initialData, open]);

  const getVestPeriodDivisor = () => {
    const period = vestPeriods.find(p => p.value === vestPeriod);
    return period?.monthlyDivisor || 1;
  };

  const calculateTotalVestValue = () => {
    const unitsNum = parseFloat(units) || 0;
    const priceNum = parseFloat(unitPrice) || 0;
    return unitsNum * priceNum;
  };

  const calculateMonthlyIncome = () => {
    const totalVest = calculateTotalVestValue();
    return totalVest / getVestPeriodDivisor();
  };

  const getMonthlyINR = () => {
    const monthly = calculateMonthlyIncome();
    if (currency === 'USD') {
      return monthly * exchangeRate;
    }
    return monthly;
  };

  const getMonthlyUSD = () => {
    const monthly = calculateMonthlyIncome();
    if (currency === 'INR') {
      return monthly / exchangeRate;
    }
    return monthly;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store amount in original currency, INR will be calculated at display time
    const monthlyAmount = calculateMonthlyIncome();

    onSubmit({
      name: `${companyName} RSU Vesting`,
      type: 'rsu_vesting',
      amount: monthlyAmount, // Monthly income in original currency
      units: parseFloat(units),
      unitPrice: parseFloat(unitPrice),
      vestPeriod,
      currency,
    });
  };

  const isValid = companyName.trim() && units && parseFloat(units) > 0 && unitPrice && parseFloat(unitPrice) > 0;
  const totalVestValue = calculateTotalVestValue();
  const monthlyIncome = calculateMonthlyIncome();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit RSU Vesting' : 'Add RSU/Equity Vesting Income'}
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
                  label="Units Vesting"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  type="number"
                  fullWidth
                  required
                  placeholder="100"
                  inputProps={{ min: 0, step: 'any' }}
                  helperText="Number of shares/units per vest"
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
                    <MenuItem value="INR">INR (Rs)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
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
                        {currency === 'USD' ? '$' : 'Rs'}
                      </InputAdornment>
                    ),
                  }}
                  placeholder="0.00"
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Vesting Period</InputLabel>
                  <Select
                    value={vestPeriod}
                    label="Vesting Period"
                    onChange={(e) => setVestPeriod(e.target.value as VestPeriod)}
                  >
                    {vestPeriods.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Tax Disclaimer */}
            <Alert severity="info" sx={{ mt: 1 }}>
              Tax is not accounted for RSU vesting as stock prices may vary at the time of vesting and sale.
            </Alert>

            {/* Calculated Value Preview */}
            {totalVestValue > 0 && (
              <Paper sx={{ p: 2, backgroundColor: 'info.light' }}>
                <Typography variant="body2" color="info.contrastText" gutterBottom>
                  Vesting Calculation
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="info.contrastText">
                    Total Value per Vest ({vestPeriods.find(p => p.value === vestPeriod)?.label})
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="info.contrastText">
                    {currency === 'USD' ? '$' : 'Rs'}
                    {totalVestValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </Typography>
                </Box>

                <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.3)', pt: 2 }}>
                  <Typography variant="caption" color="info.contrastText">
                    Monthly Income (calculated)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="h5" fontWeight={700} color="info.contrastText">
                        {currency === 'USD' ? '$' : 'Rs'}
                        {monthlyIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="caption" color="info.contrastText">
                        {currency}/month
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="h6" fontWeight={600} color="info.contrastText">
                        {currency === 'USD' ? 'Rs' : '$'}
                        {(currency === 'USD' ? getMonthlyINR() : getMonthlyUSD()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="caption" color="info.contrastText">
                        {currency === 'USD' ? 'INR' : 'USD'}/month (@ {exchangeRate})
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
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
            color="info"
            disabled={!isValid || loading}
          >
            {loading ? 'Saving...' : initialData ? 'Update' : 'Add RSU Vesting'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RSUVestingForm;
