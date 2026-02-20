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
  FormHelperText,
  ListItemText,
} from '@mui/material';
import type { Debt, Expense, InterestRateType } from '../../types';
import { expenseService } from '../../services/expenseService';
import { formatCurrency } from '../../utils/formatters';

interface DebtFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Debt> & { linkedExpenseId?: string }) => void;
  initialData?: Debt | null;
  loading?: boolean;
}

const interestRateTypes: { value: InterestRateType; label: string }[] = [
  { value: 'reducing', label: 'Reducing Balance' },
  { value: 'fixed', label: 'Fixed (Flat)' },
  { value: 'variable', label: 'Variable' },
  { value: 'other', label: 'Other' },
];

const DebtForm: React.FC<DebtFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestRateType, setInterestRateType] = useState<InterestRateType>('reducing');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDate, setDueDate] = useState<number | ''>('');
  const [linkedExpenseId, setLinkedExpenseId] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (open && !initialData) {
      expenseService.getAll().then(setExpenses).catch(() => setExpenses([]));
    }
  }, [open, initialData]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTotalAmount(initialData.totalAmount.toString());
      setCurrentBalance(initialData.currentBalance.toString());
      setInterestRate(initialData.interestRate.toString());
      setInterestRateType(initialData.interestRateType);
      setMonthlyPayment(initialData.monthlyPayment.toString());
      setAdditionalPayment(initialData.additionalPayment?.toString() || '0');
      setStartDate(initialData.startDate.split('T')[0]);
      setEndDate(initialData.endDate.split('T')[0]);
      setDueDate(initialData.dueDate ?? '');
      setLinkedExpenseId(initialData.linkedExpenseId || '');
    } else {
      setName('');
      setTotalAmount('');
      setCurrentBalance('');
      setInterestRate('');
      setInterestRateType('reducing');
      setMonthlyPayment('');
      setAdditionalPayment('');
      setStartDate('');
      setEndDate('');
      setDueDate('');
      setLinkedExpenseId('');
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      totalAmount: parseFloat(totalAmount),
      currentBalance: currentBalance ? parseFloat(currentBalance) : parseFloat(totalAmount),
      interestRate: parseFloat(interestRate),
      interestRateType,
      monthlyPayment: parseFloat(monthlyPayment),
      additionalPayment: additionalPayment ? parseFloat(additionalPayment) : 0,
      startDate,
      endDate,
      ...(dueDate !== '' && { dueDate: Number(dueDate) }),
      ...(linkedExpenseId && { linkedExpenseId }),
      currency: 'INR',
    });
  };

  const isValid =
    name.trim() &&
    totalAmount && parseFloat(totalAmount) > 0 &&
    interestRate && parseFloat(interestRate) >= 0 &&
    monthlyPayment && parseFloat(monthlyPayment) > 0 &&
    startDate &&
    endDate;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Debt' : 'Add Debt'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., Home Loan"
            />
            <TextField
              label="Total Amount (Principal)"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              type="number"
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
            <TextField
              label="Current Balance"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              type="number"
              fullWidth
              helperText="Leave empty to use total amount"
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Interest Rate (%)"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                type="number"
                fullWidth
                required
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
              <FormControl fullWidth>
                <InputLabel>Rate Type</InputLabel>
                <Select
                  value={interestRateType}
                  label="Rate Type"
                  onChange={(e) => setInterestRateType(e.target.value as InterestRateType)}
                >
                  {interestRateTypes.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Monthly Payment (EMI)"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                type="number"
                fullWidth
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
              <TextField
                label="Additional Payment"
                value={additionalPayment}
                onChange={(e) => setAdditionalPayment(e.target.value)}
                type="number"
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date (Projected)"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Box>
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
            </FormControl>
            {!initialData && (
              <FormControl fullWidth>
                <InputLabel>Link to Expense</InputLabel>
                <Select
                  value={linkedExpenseId}
                  label="Link to Expense"
                  onChange={(e) => setLinkedExpenseId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Create new expense automatically</em>
                  </MenuItem>
                  {expenses.map((exp) => (
                    <MenuItem key={exp._id} value={exp._id}>
                      <ListItemText
                        primary={exp.name}
                        secondary={`${formatCurrency(exp.amount)} - ${exp.category}`}
                      />
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Link an existing expense or leave empty to auto-create one
                </FormHelperText>
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

export default DebtForm;
