import React from 'react';
import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { CreditCard, EventNote, ReceiptLong } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Debt, Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { categoryColors } from '../../theme/theme';

interface UpcomingItem {
  id: string;
  label: string;
  amount: number;
  dueDate: number;
  daysUntil: number;
  kind: 'expense' | 'debt';
}

interface UpcomingPanelProps {
  expenses: Expense[];
  debts: Debt[];
}

const daysUntilDue = (dueDate: number, today: Date): number => {
  const year = today.getFullYear();
  const month = today.getMonth();
  let next = new Date(year, month, dueDate);
  if (next < new Date(year, month, today.getDate())) {
    next = new Date(year, month + 1, dueDate);
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((next.getTime() - new Date(year, month, today.getDate()).getTime()) / msPerDay);
};

const dueLabel = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days}d`;
};

const UpcomingPanel: React.FC<UpcomingPanelProps> = ({ expenses, debts }) => {
  const navigate = useNavigate();
  const today = new Date();

  const items: UpcomingItem[] = [
    ...expenses
      .filter((e) => e.isRecurring && e.dueDate)
      .map((e) => ({
        id: e._id,
        label: e.name,
        amount: e.amount,
        dueDate: e.dueDate!,
        daysUntil: daysUntilDue(e.dueDate!, today),
        kind: 'expense' as const,
      })),
    ...debts
      .filter((d) => d.status === 'active' && d.dueDate)
      .map((d) => ({
        id: d._id,
        label: d.name,
        amount: d.monthlyPayment,
        dueDate: d.dueDate!,
        daysUntil: daysUntilDue(d.dueDate!, today),
        kind: 'debt' as const,
      })),
  ]
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <EventNote fontSize="small" color="action" />
        <Typography variant="h6" fontWeight={600}>
          Coming Up
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upcoming bills and debt payments
      </Typography>

      {items.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            Nothing scheduled. Add due dates to recurring expenses to see them here.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => {
            const isSoon = item.daysUntil <= 3;
            return (
              <Box
                key={`${item.kind}-${item.id}`}
                onClick={() => navigate(item.kind === 'debt' ? '/debts' : '/expenses')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor:
                      item.kind === 'debt'
                        ? `${categoryColors.expenses}1A`
                        : `${categoryColors.sip}1A`,
                    color: item.kind === 'debt' ? categoryColors.expenses : categoryColors.sip,
                  }}
                >
                  {item.kind === 'debt' ? (
                    <CreditCard fontSize="small" />
                  ) : (
                    <ReceiptLong fontSize="small" />
                  )}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatCurrency(item.amount)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={dueLabel(item.daysUntil)}
                  color={isSoon ? 'warning' : 'default'}
                  variant={isSoon ? 'filled' : 'outlined'}
                  sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};

export default UpcomingPanel;
