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
import type { Income, IncomeType } from '../../types';

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Income>) => void;
  initialData?: Income | null;
  loading?: boolean;
}

const incomeTypes: { value: IncomeType; label: string }[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'other', label: 'Other' },
];

const IncomeForm: React.FC<IncomeFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [preTaxAmount, setPreTaxAmount] = useState('');
  const [postTaxAmount, setPostTaxAmount] = useState('');
  const [type, setType] = useState<IncomeType>('salary');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPreTaxAmount(initialData.preTaxAmount?.toString() || initialData.amount.toString());
      setPostTaxAmount(initialData.postTaxAmount?.toString() || initialData.amount.toString());
      setType(initialData.type);
    } else {
      setName('');
      setPreTaxAmount('');
      setPostTaxAmount('');
      setType('salary');
    }
  }, [initialData, open]);

  const calculateTaxPaid = () => {
    const preTax = parseFloat(preTaxAmount) || 0;
    const postTax = parseFloat(postTaxAmount) || 0;
    return Math.max(0, preTax - postTax);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const preTax = parseFloat(preTaxAmount);
    const postTax = parseFloat(postTaxAmount);
    const taxPaid = calculateTaxPaid();

    onSubmit({
      name,
      amount: postTax, // Use post-tax as the effective monthly income
      preTaxAmount: preTax,
      postTaxAmount: postTax,
      taxPaid,
      type,
      currency: 'INR',
    });
  };

  const isValid = name.trim() && preTaxAmount && parseFloat(preTaxAmount) > 0 && postTaxAmount && parseFloat(postTaxAmount) > 0;
  const taxPaid = calculateTaxPaid();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Income Source' : 'Add Income Source'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., UiPath Salary"
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={type}
                label="Type"
                onChange={(e) => setType(e.target.value as IncomeType)}
              >
                {incomeTypes.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Pre-Tax Amount (Gross)"
                  value={preTaxAmount}
                  onChange={(e) => setPreTaxAmount(e.target.value)}
                  type="number"
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  placeholder="0"
                  helperText="Monthly gross income"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Post-Tax Amount (Net)"
                  value={postTaxAmount}
                  onChange={(e) => setPostTaxAmount(e.target.value)}
                  type="number"
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  placeholder="0"
                  helperText="Monthly take-home income"
                />
              </Grid>
            </Grid>

            {/* Tax Summary */}
            {taxPaid > 0 && (
              <Paper sx={{ p: 2, backgroundColor: 'warning.light' }}>
                <Typography variant="body2" color="warning.contrastText" gutterBottom>
                  Tax Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="warning.contrastText">
                      Monthly Tax Paid
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.contrastText">
                      ₹{taxPaid.toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="warning.contrastText">
                      Effective Tax Rate
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.contrastText">
                      {((taxPaid / (parseFloat(preTaxAmount) || 1)) * 100).toFixed(1)}%
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
            disabled={!isValid || loading}
          >
            {loading ? 'Saving...' : initialData ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default IncomeForm;
