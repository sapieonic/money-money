import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  InputAdornment,
  IconButton,
  Stack,
} from '@mui/material';
import { Clear, Search } from '@mui/icons-material';
import type { DailyExpenseCategory } from '../../types';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  category: string;
  search: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onCategoryChange: (category: string) => void;
  onSearchChange: (search: string) => void;
  onClear: () => void;
}

const categories: { value: DailyExpenseCategory; label: string }[] = [
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

const SEARCH_DEBOUNCE_MS = 350;

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  category,
  search,
  onStartDateChange,
  onEndDateChange,
  onCategoryChange,
  onSearchChange,
  onClear,
}) => {
  // Local input state so typing feels instant; propagate after a debounce.
  const [searchInput, setSearchInput] = useState(search);

  // Keep local input in sync if parent clears the filter.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (searchInput === search) return;
    const id = window.setTimeout(() => {
      onSearchChange(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput, search, onSearchChange]);

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const { start, end } = preset.getValue();
    onStartDateChange(start);
    onEndDateChange(end);
  };

  const handleCategoryToggle = (value: DailyExpenseCategory) => {
    onCategoryChange(category === value ? '' : value);
  };

  const hasFilters = startDate || endDate || category || search;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Date presets */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {presets.map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            onClick={() => handlePresetClick(preset)}
            variant="outlined"
            size="small"
          />
        ))}
      </Stack>

      {/* Search + date range */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center', gap: 2 }}
      >
        <TextField
          placeholder="Search description or vendor"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          sx={{ minWidth: 240, flexGrow: 1, maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchInput('')}
                  aria-label="clear search"
                >
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <TextField
          label="From"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="To"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ minWidth: 150 }}
        />
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
      </Stack>

      {/* Category quick-toggle chips */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {categories.map((c) => {
          const selected = category === c.value;
          return (
            <Chip
              key={c.value}
              label={c.label}
              onClick={() => handleCategoryToggle(c.value)}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              size="small"
            />
          );
        })}
      </Stack>
    </Box>
  );
};

export default DateRangeFilter;
