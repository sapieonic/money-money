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
  FormControlLabel,
  Switch,
  FormHelperText,
} from '@mui/material';
import type { Expense, ExpenseCategory } from '../../types';

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Expense>) => void;
  initialData?: Expense | null;
  loading?: boolean;
}

const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: 'housing', label: 'Housing' },
  { value: 'transport', label: 'Transport' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'loan', label: 'Loan/EMI' },
  { value: 'other', label: 'Other' },
];

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [isRecurring, setIsRecurring] = useState(true);
  const [dueDate, setDueDate] = useState<number | ''>('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setIsRecurring(initialData.isRecurring);
      setDueDate(initialData.dueDate ?? '');
    } else {
      setName('');
      setAmount('');
      setCategory('other');
      setIsRecurring(true);
      setDueDate('');
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      amount: parseFloat(amount),
      category,
      isRecurring,
      ...(dueDate !== '' && { dueDate: Number(dueDate) }),
      currency: 'INR',
    });
  };

  const isValid = name.trim() && amount && parseFloat(amount) > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Expense' : 'Add Expense'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., House Rent"
            />
            <TextField
              label="Amount"
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
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {expenseCategories.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
              }
              label="Recurring (Monthly)"
            />
            {isRecurring && (
              <FormControl fullWidth>
                <InputLabel>Due Date (Day of Month)</InputLabel>
                <Select
                  value={dueDate}
                  label="Due Date (Day of Month)"
                  onChange={(e) => setDueDate(e.target.value as number | '')}
                >
                  <MenuItem value="">
                    <em>Not set</em>
                  </MenuItem>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>When is this expense due each month?</FormHelperText>
              </FormControl>
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

export default ExpenseForm;
