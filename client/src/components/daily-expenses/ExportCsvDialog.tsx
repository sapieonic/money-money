import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Chip,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { dailyExpenseService } from '../../services/dailyExpenseService';
import { toCsv, downloadCsv } from '../../utils/csv';
import { capitalizeFirst } from '../../utils/formatters';
import type { DailyExpense } from '../../types';

interface ExportCsvDialogProps {
  open: boolean;
  onClose: () => void;
  onError?: (message: string) => void;
}

// Format as YYYY-MM-DD from the date's *local* components. Using toISOString()
// here would emit a UTC date, shifting the day for users ahead of/behind UTC
// (e.g. an IST user picking "This Month" would get the previous day as start).
const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const presets: { label: string; getValue: () => { start: string; end: string } }[] = [
  {
    label: 'This Month',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toDateString(start), end: toDateString(today) };
    },
  },
  {
    label: 'Last Month',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toDateString(start), end: toDateString(end) };
    },
  },
  {
    label: 'Last 3 Months',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      return { start: toDateString(start), end: toDateString(today) };
    },
  },
  {
    label: 'This Year',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1);
      return { start: toDateString(start), end: toDateString(today) };
    },
  },
];

const ExportCsvDialog: React.FC<ExportCsvDialogProps> = ({ open, onClose, onError }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handlePresetClick = (preset: (typeof presets)[number]) => {
    const { start, end } = preset.getValue();
    setStartDate(start);
    setEndDate(end);
    setValidationError(null);
  };

  const handleClose = () => {
    if (exporting) return;
    onClose();
  };

  const handleExport = async () => {
    if (startDate && endDate && startDate > endDate) {
      setValidationError('"From" date must be on or before the "To" date.');
      return;
    }
    setValidationError(null);

    try {
      setExporting(true);
      const filters: { startDate?: string; endDate?: string } = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const expenses = await dailyExpenseService.getAllForExport(filters);

      if (expenses.length === 0) {
        setValidationError('No expenses found for the selected period.');
        return;
      }

      const csv = toCsv<DailyExpense>(expenses, [
        { header: 'Date', accessor: (e) => e.date?.split('T')[0] ?? '' },
        { header: 'Description', accessor: (e) => e.description },
        { header: 'Vendor', accessor: (e) => e.vendor },
        { header: 'Category', accessor: (e) => capitalizeFirst(e.category) },
        { header: 'Amount', accessor: (e) => e.amount },
        { header: 'Currency', accessor: (e) => e.currency },
      ]);

      const rangeLabel = startDate || endDate
        ? `_${startDate || 'start'}_to_${endDate || 'today'}`
        : '_all';
      downloadCsv(`daily-expenses${rangeLabel}.csv`, csv);
      onClose();
    } catch (err) {
      console.error(err);
      onError?.('Failed to export expenses. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Download Expenses CSV</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a time period to export. Leave the dates empty to download all
          expenses.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {presets.map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              onClick={() => handlePresetClick(preset)}
              variant="outlined"
              size="small"
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="From Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ flex: 1, minWidth: 140 }}
          />
          <TextField
            label="To Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ flex: 1, minWidth: 140 }}
          />
        </Box>

        {validationError && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {validationError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={exporting} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={exporting}
          startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
        >
          {exporting ? 'Preparing...' : 'Download CSV'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportCsvDialog;
