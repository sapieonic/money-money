import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Chip,
  Paper,
  Grid,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import type { Income } from '../../types';
import { formatCurrency, capitalizeFirst } from '../../utils/formatters';

interface IncomeListProps {
  incomes: Income[];
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  exchangeRate?: number;
}

const incomeTypeColors: Record<string, string> = {
  salary: '#4caf50',
  freelance: '#2196f3',
  dividend: '#9c27b0',
  rental: '#ff9800',
  rsu_vesting: '#00bcd4',
  other: '#607d8b',
};

const getVestPeriodLabel = (period?: string) => {
  switch (period) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semi_annual': return 'Semi-Annual';
    case 'annual': return 'Annual';
    default: return '';
  }
};

const IncomeList: React.FC<IncomeListProps> = ({ incomes, onEdit, onDelete, exchangeRate = 89 }) => {
  // Helper to get RSU income in INR (stored in original currency)
  const getRSUIncomeINR = (income: Income) => {
    if (income.currency === 'USD') {
      return income.amount * exchangeRate;
    }
    return income.amount;
  };
  if (incomes.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No income sources added yet. Click "Add Income" to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <List disablePadding>
        {incomes.map((income, index) => (
          <ListItem
            key={income._id}
            divider={index < incomes.length - 1}
            secondaryAction={
              <Box>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => onEdit(income)}
                  sx={{ mr: 0.5 }}
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => onDelete(income)}
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body1" fontWeight={500}>
                    {income.name}
                  </Typography>
                  <Chip
                    label={income.type === 'rsu_vesting' ? 'RSU Vesting' : capitalizeFirst(income.type)}
                    size="small"
                    sx={{
                      backgroundColor: `${incomeTypeColors[income.type] || incomeTypeColors.other}20`,
                      color: incomeTypeColors[income.type] || incomeTypeColors.other,
                    }}
                  />
                  {income.type === 'rsu_vesting' && income.vestPeriod && (
                    <Chip
                      label={getVestPeriodLabel(income.vestPeriod)}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  {income.type === 'rsu_vesting' ? (
                    // RSU Vesting display - amount stored in original currency, converted to INR at display
                    <Box>
                      <Typography variant="h6" color="info.main" fontWeight={600}>
                        {formatCurrency(getRSUIncomeINR(income))}/month
                      </Typography>
                      {income.currency === 'USD' && (
                        <Typography variant="body2" color="text.secondary">
                          ${income.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}/month @ ₹{exchangeRate}
                        </Typography>
                      )}
                      {income.units && income.unitPrice && (
                        <Typography variant="caption" color="text.secondary">
                          {income.units} units @ {income.currency === 'USD' ? '$' : '₹'}{income.unitPrice.toLocaleString()} ({income.currency})
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    // Regular income display with tax info
                    <Grid container spacing={2} alignItems="center">
                      <Grid>
                        <Typography variant="h6" color="success.main" fontWeight={600}>
                          {formatCurrency(income.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Net (Take-home)
                        </Typography>
                      </Grid>
                      {income.taxPaid && income.taxPaid > 0 && (
                        <>
                          <Grid>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(income.preTaxAmount || income.amount)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Gross
                            </Typography>
                          </Grid>
                          <Grid>
                            <Typography variant="body2" color="error.main" fontWeight={500}>
                              -{formatCurrency(income.taxPaid)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Tax/month
                            </Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default IncomeList;
