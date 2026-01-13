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
} from '@mui/material';
import type { Investment, InvestmentType, InvestmentCategory } from '../../types';

interface InvestmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Investment>) => void;
  initialData?: Investment | null;
  loading?: boolean;
  defaultType?: InvestmentType;
}

const investmentCategories: { value: InvestmentCategory; label: string }[] = [
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

const InvestmentForm: React.FC<InvestmentFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  defaultType = 'sip',
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<InvestmentType>(defaultType);
  const [category, setCategory] = useState<InvestmentCategory>('mutual_fund');
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setPlatform(initialData.platform);
    } else {
      setName('');
      setAmount('');
      setType(defaultType);
      setCategory('mutual_fund');
      setPlatform('');
    }
  }, [initialData, open, defaultType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      amount: parseFloat(amount),
      type,
      category,
      platform,
      currency: 'INR',
    });
  };

  const isValid = name.trim() && amount && parseFloat(amount) > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData
            ? 'Edit Investment'
            : type === 'sip'
            ? 'Add SIP'
            : 'Add Voluntary Investment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., Jupiter MF"
            />
            <TextField
              label="Monthly Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              placeholder="0"
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={type}
                label="Type"
                onChange={(e) => setType(e.target.value as InvestmentType)}
              >
                <MenuItem value="sip">SIP (Systematic)</MenuItem>
                <MenuItem value="voluntary">Voluntary</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value as InvestmentCategory)}
              >
                {investmentCategories.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              fullWidth
              placeholder="e.g., Groww, Zerodha"
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

export default InvestmentForm;
