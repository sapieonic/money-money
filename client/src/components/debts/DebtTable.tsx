import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import { Visibility, Edit, Delete } from '@mui/icons-material';
import type { Debt } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { debtStatusColors } from '../../theme/theme';

interface DebtTableProps {
  debts: Debt[];
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onView: (debt: Debt) => void;
}

const DebtTable: React.FC<DebtTableProps> = ({ debts, onEdit, onDelete, onView }) => {
  if (debts.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No debts found. Add your first debt to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Total Amount</TableCell>
            <TableCell align="right">Balance</TableCell>
            <TableCell align="right">Interest Rate</TableCell>
            <TableCell align="right">EMI</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {debts.map((debt) => {
            const progress = ((debt.totalAmount - debt.currentBalance) / debt.totalAmount) * 100;
            const statusColor = debtStatusColors[debt.status] || '#90a4ae';

            return (
              <TableRow key={debt._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {debt.name}
                  </Typography>
                  {debt.dueDate && (
                    <Typography variant="caption" color="text.secondary">
                      Due: {debt.dueDate}th of month
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(debt.totalAmount)}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={debt.currentBalance > 0 ? 'error.main' : 'success.main'}
                  >
                    {formatCurrency(debt.currentBalance)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {debt.interestRate}%
                  <Typography variant="caption" display="block" color="text.secondary">
                    {debt.interestRateType}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(debt.monthlyPayment)}
                  {debt.additionalPayment > 0 && (
                    <Typography variant="caption" display="block" color="success.main">
                      +{formatCurrency(debt.additionalPayment)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={debt.status.replace('_', ' ')}
                    size="small"
                    sx={{
                      backgroundColor: `${statusColor}20`,
                      color: statusColor,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 120 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(progress, 100)}
                      sx={{
                        flexGrow: 1,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: progress >= 100 ? '#4caf50' : '#2196f3',
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                      {Math.round(progress)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => onView(debt)} color="primary">
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(debt)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(debt)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DebtTable;
