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
import type { DailyExpense, DailyExpenseCategory } from '../../types';

interface DailyExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<DailyExpense>) => void;
  initialData?: DailyExpense | null;
  loading?: boolean;
}

const dailyExpenseCategories: { value: DailyExpenseCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'travel', label: 'Travel' },
  { value: 'health', label: 'Health' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

const DailyExpenseForm: React.FC<DailyExpenseFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<DailyExpenseCategory>('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setVendor(initialData.vendor || '');
      setCategory(initialData.category);
      setDate(new Date(initialData.date).toISOString().split('T')[0]);
    } else {
      setAmount('');
      setDescription('');
      setVendor('');
      setCategory('food');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      amount: parseFloat(amount),
      description,
      vendor,
      category,
      date,
      currency: 'INR',
    });
  };

  const isValid = description.trim() && amount && parseFloat(amount) > 0 && date;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Daily Expense' : 'Add Daily Expense'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              fullWidth
              required
              autoFocus
              InputProps={{
                startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
              }}
              placeholder="0"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              placeholder="e.g., Lunch at cafe"
            />
            <TextField
              label="Vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              fullWidth
              placeholder="e.g., Swiggy, Amazon, Uber"
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value as DailyExpenseCategory)}
              >
                {dailyExpenseCategories.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
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

export default DailyExpenseForm;
