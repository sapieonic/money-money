import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Grid,
  Chip,
  Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import type { DailyExpense, Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CalendarViewProps {
  month: string; // Format: YYYY-MM
  dailyExpenses: DailyExpense[];
  recurringExpenses: Expense[];
  onMonthChange: (newMonth: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarView: React.FC<CalendarViewProps> = ({
  month,
  dailyExpenses,
  recurringExpenses,
  onMonthChange,
}) => {
  const [year, monthNum] = month.split('-').map(Number);
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && monthNum === today.getMonth() + 1;
  const currentDay = today.getDate();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Navigate to previous month
  const handlePrevMonth = () => {
    const prevMonth = new Date(year, monthNum - 2, 1);
    const newMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const nextMonth = new Date(year, monthNum, 1);
    const newMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  // Navigate to current month
  const handleCurrentMonth = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(currentMonth);
  };

  // Get expenses for a specific day
  const getExpensesForDay = (day: number) => {
    const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const filtered = dailyExpenses.filter((exp) => {
      // Handle both YYYY-MM-DD and ISO date formats
      const expDate = exp.date.split('T')[0]; // Remove time if present
      return expDate === dateStr;
    });
    return filtered;
  };

  // Get recurring expenses due on a specific day
  const getRecurringExpensesForDay = (day: number) => {
    return recurringExpenses.filter((exp) => exp.dueDate === day);
  };

  // Calculate total amount for a day
  const getTotalForDay = (day: number) => {
    const expenses = getExpensesForDay(day);
    const recurringExpensesForDay = getRecurringExpensesForDay(day);
    const dailyTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const recurringTotal = recurringExpensesForDay.reduce((sum, exp) => sum + exp.amount, 0);
    return { dailyTotal, recurringTotal, total: dailyTotal + recurringTotal };
  };

  // Determine day status
  const getDayStatus = (day: number): 'past' | 'current' | 'upcoming' => {
    if (!isCurrentMonth) {
      // If not current month, all days in future months are upcoming, all in past months are past
      const monthDate = new Date(year, monthNum - 1, day);
      return monthDate > today ? 'upcoming' : 'past';
    }
    if (day < currentDay) return 'past';
    if (day === currentDay) return 'current';
    return 'upcoming';
  };

  // Get background color based on day status
  const getDayBackgroundColor = (status: 'past' | 'current' | 'upcoming') => {
    switch (status) {
      case 'current':
        return 'primary.light';
      case 'past':
        return 'grey.200';
      case 'upcoming':
        return 'background.paper';
      default:
        return 'background.paper';
    }
  };

  // Get text color based on day status
  const getDayTextColor = (status: 'past' | 'current' | 'upcoming') => {
    switch (status) {
      case 'current':
        return 'primary.main';
      case 'past':
        return 'text.secondary';
      case 'upcoming':
        return 'text.primary';
      default:
        return 'text.primary';
    }
  };

  // Render calendar days
  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <Grid key={`empty-${i}`} size={{ xs: 12 / 7 }}>
          <Box sx={{ p: 1, minHeight: 120 }} />
        </Grid>
      );
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDayStatus(day);
      const { dailyTotal, recurringTotal } = getTotalForDay(day);
      const expenses = getExpensesForDay(day);
      const recurringExpensesForDay = getRecurringExpensesForDay(day);
      const hasExpenses = expenses.length > 0 || recurringExpensesForDay.length > 0;

      days.push(
        <Grid key={day} size={{ xs: 12 / 7 }}>
          <Paper
            sx={{
              p: 1,
              minHeight: 120,
              backgroundColor: getDayBackgroundColor(status),
              border: status === 'current' ? 2 : 1,
              borderColor: status === 'current' ? 'primary.main' : 'divider',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s',
              opacity: status === 'past' ? 0.7 : 1,
              '&:hover': hasExpenses
                ? {
                    boxShadow: 2,
                    transform: 'translateY(-2px)',
                    opacity: 1,
                  }
                : {},
            }}
          >
            <Typography
              variant="body2"
              fontWeight={status === 'current' ? 700 : 500}
              color={getDayTextColor(status)}
              sx={{ mb: 0.5 }}
            >
              {day}
            </Typography>

            {hasExpenses && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {/* Daily expenses */}
                {dailyTotal > 0 && (
                  <Tooltip
                    title={
                      <Box>
                        <Typography variant="caption" fontWeight={600}>
                          Daily Expenses:
                        </Typography>
                        {expenses.map((exp, idx) => (
                          <Typography key={idx} variant="caption" display="block">
                            • {exp.description}: {formatCurrency(exp.amount)}
                          </Typography>
                        ))}
                      </Box>
                    }
                    arrow
                  >
                    <Chip
                      label={formatCurrency(dailyTotal)}
                      size="small"
                      color="error"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  </Tooltip>
                )}

                {/* Recurring expenses due */}
                {recurringTotal > 0 && (
                  <Tooltip
                    title={
                      <Box>
                        <Typography variant="caption" fontWeight={600}>
                          Due Today:
                        </Typography>
                        {recurringExpensesForDay.map((exp, idx) => (
                          <Typography key={idx} variant="caption" display="block">
                            • {exp.name}: {formatCurrency(exp.amount)}
                          </Typography>
                        ))}
                      </Box>
                    }
                    arrow
                  >
                    <Chip
                      label={`Due: ${formatCurrency(recurringTotal)}`}
                      size="small"
                      color="warning"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  </Tooltip>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      );
    }

    return days;
  };

  const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <Box>
      {/* Calendar Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <IconButton onClick={handlePrevMonth} size="small">
          <ChevronLeft />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {monthName}
          </Typography>
          {!isCurrentMonth && (
            <Chip
              label="Go to Current Month"
              size="small"
              color="primary"
              onClick={handleCurrentMonth}
              sx={{ cursor: 'pointer' }}
            />
          )}
        </Box>

        <IconButton onClick={handleNextMonth} size="small">
          <ChevronRight />
        </IconButton>
      </Box>

      {/* Day of Week Headers */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {DAYS_OF_WEEK.map((day) => (
          <Grid key={day} size={{ xs: 12 / 7 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              align="center"
              display="block"
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Grid */}
      <Grid container spacing={1}>
        {renderCalendarDays()}
      </Grid>

      {/* Summary Info */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mt: 2,
          mb: 2,
          justifyContent: 'center',
          flexWrap: 'wrap',
          p: 1.5,
          backgroundColor: 'action.hover',
          borderRadius: 1,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Daily Expenses This Month
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {dailyExpenses.length} transaction{dailyExpenses.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Recurring Expenses with Due Dates
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {recurringExpenses.length} expense{recurringExpenses.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: 'grey.200',
              border: 1,
              borderColor: 'divider',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Past Days
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: 'primary.light',
              border: 2,
              borderColor: 'primary.main',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Today
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Upcoming Days
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Amount" size="small" color="error" sx={{ fontSize: '0.65rem', height: 16 }} />
          <Typography variant="caption" color="text.secondary">
            Daily Expenses
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Due" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 16 }} />
          <Typography variant="caption" color="text.secondary">
            Recurring Due
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarView;
