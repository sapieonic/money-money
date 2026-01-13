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
import type { Expense } from '../../types';
import { formatCurrency, capitalizeFirst } from '../../utils/formatters';
import { expenseCategoryColors } from '../../theme/theme';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onEdit, onDelete }) => {
  if (expenses.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No expenses added yet. Click "Add Expense" to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <List disablePadding>
        {expenses.map((expense, index) => (
          <ListItem
            key={expense._id}
            divider={index < expenses.length - 1}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight={500}>
                    {expense.name}
                  </Typography>
                  <Chip
                    label={capitalizeFirst(expense.category)}
                    size="small"
                    sx={{
                      backgroundColor: `${expenseCategoryColors[expense.category]}20`,
                      color: expenseCategoryColors[expense.category],
                      borderColor: expenseCategoryColors[expense.category],
                    }}
                    variant="outlined"
                  />
                  {expense.isRecurring && (
                    <Chip label="Monthly" size="small" color="info" variant="outlined" />
                  )}
                </Box>
              }
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
};

export default ExpenseList;
