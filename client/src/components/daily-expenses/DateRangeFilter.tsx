import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import { Clear } from '@mui/icons-material';
import type { DailyExpenseCategory } from '../../types';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  category: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onCategoryChange: (category: string) => void;
  onClear: () => void;
}

const categories: { value: DailyExpenseCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'food', label: 'Food' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'travel', label: 'Travel' },
  { value: 'health', label: 'Health' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

const presets = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    },
  },
  {
    label: 'This Week',
    getValue: () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: startOfWeek.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'This Month',
    getValue: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: startOfMonth.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    },
  },
];

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  category,
  onStartDateChange,
  onEndDateChange,
  onCategoryChange,
  onClear,
}) => {
  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const { start, end } = preset.getValue();
    onStartDateChange(start);
    onEndDateChange(end);
  };

  const hasFilters = startDate || endDate || category;

  return (
    <Box sx={{ mb: 3 }}>
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
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="From Date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="To Date"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ minWidth: 150 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {categories.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {hasFilters && (
          <Button
            startIcon={<Clear />}
            onClick={onClear}
            size="small"
            color="inherit"
          >
            Clear
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default DateRangeFilter;
