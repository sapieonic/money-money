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
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import type { DailyExpense } from '../../types';
import { formatCurrency, formatDate, capitalizeFirst } from '../../utils/formatters';
import { dailyExpenseCategoryColors } from '../../theme/theme';

interface DailyExpenseListProps {
  expenses: DailyExpense[];
  onEdit: (expense: DailyExpense) => void;
  onDelete: (expense: DailyExpense) => void;
}

const groupByDate = (expenses: DailyExpense[]): Record<string, DailyExpense[]> => {
  return expenses.reduce((groups, expense) => {
    const dateKey = new Date(expense.date).toISOString().split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(expense);
    return groups;
  }, {} as Record<string, DailyExpense[]>);
};

const DailyExpenseList: React.FC<DailyExpenseListProps> = ({
  expenses,
  onEdit,
  onDelete,
}) => {
  if (expenses.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No daily expenses found. Click "Add Expense" to get started.
        </Typography>
      </Paper>
    );
  }

  const groupedExpenses = groupByDate(expenses);
  const sortedDates = Object.keys(groupedExpenses).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Box>
      {sortedDates.map((dateKey) => {
        const dayExpenses = groupedExpenses[dateKey];
        const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        return (
          <Paper key={dateKey} sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                backgroundColor: 'grey.100',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {formatDate(dateKey)}
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} color="error.main">
                {formatCurrency(dayTotal)}
              </Typography>
            </Box>

            <List disablePadding>
              {dayExpenses.map((expense, index) => (
                <ListItem
                  key={expense._id}
                  divider={index < dayExpenses.length - 1}
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => onEdit(expense)}
                        sx={{ mr: 0.5 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => onDelete(expense)}
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
                          {expense.description}
                        </Typography>
                        {expense.vendor && (
                          <Typography variant="body2" color="text.secondary">
                            @ {expense.vendor}
                          </Typography>
                        )}
                        <Chip
                          label={capitalizeFirst(expense.category)}
                          size="small"
                          sx={{
                            backgroundColor: `${dailyExpenseCategoryColors[expense.category]}20`,
                            color: dailyExpenseCategoryColors[expense.category],
                            borderColor: dailyExpenseCategoryColors[expense.category],
                          }}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Typography variant="h6" color="error.main" fontWeight={600}>
                        {formatCurrency(expense.amount)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        );
      })}
    </Box>
  );
};

export default DailyExpenseList;
