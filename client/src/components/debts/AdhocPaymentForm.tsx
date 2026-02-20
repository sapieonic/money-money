import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Box,
} from '@mui/material';
import { formatCurrency } from '../../utils/formatters';

interface AdhocPaymentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; date?: string; note?: string }) => void;
  loading?: boolean;
  maxAmount: number;
}

const AdhocPaymentForm: React.FC<AdhocPaymentFormProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  maxAmount,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      amount: parseFloat(amount),
      ...(date && { date }),
      ...(note.trim() && { note: note.trim() }),
    });
  };

  const parsedAmount = parseFloat(amount);
  const isValid = amount && parsedAmount > 0 && parsedAmount <= maxAmount;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Ad-hoc Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              fullWidth
              required
              helperText={`Max: ${formatCurrency(maxAmount)} (current balance)`}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
            <TextField
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Bonus payment"
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
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdhocPaymentForm;
