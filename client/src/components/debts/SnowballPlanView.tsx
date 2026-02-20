import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Chip,
} from '@mui/material';
import { ExpandMore, ExpandLess, TrendingDown, AccountBalance } from '@mui/icons-material';
import type { SnowballStrategy, SnowballPlanResult } from '../../types';
import { debtService } from '../../services/debtService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const SnowballPlanView: React.FC = () => {
  const [strategy, setStrategy] = useState<SnowballStrategy>('snowball');
  const [plan, setPlan] = useState<SnowballPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  useEffect(() => {
    loadPlan();
  }, [strategy]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await debtService.getSnowballPlan(strategy);
      setPlan(data);
    } catch {
      setError('Failed to load snowball plan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          Debt Payoff Strategy
        </Typography>
        <ToggleButtonGroup
          value={strategy}
          exclusive
          onChange={(_, val) => val && setStrategy(val)}
          size="small"
        >
          <ToggleButton value="snowball">
            <TrendingDown sx={{ mr: 0.5, fontSize: 18 }} />
            Snowball
          </ToggleButton>
          <ToggleButton value="avalanche">
            <AccountBalance sx={{ mr: 0.5, fontSize: 18 }} />
            Avalanche
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {plan && !plan.summary && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No active debts to create a payoff plan.
          </Typography>
        </Paper>
      )}

      {plan?.summary && (
        <>
          {/* Summary Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Interest</Typography>
              <Typography variant="h6" fontWeight={700} color="error.main">
                {formatCurrency(plan.summary.totalInterest)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Months to Payoff</Typography>
              <Typography variant="h6" fontWeight={700}>
                {plan.summary.totalMonths}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Projected Date</Typography>
              <Typography variant="h6" fontWeight={700}>
                {plan.summary.projectedPayoffDate
                  ? formatDate(plan.summary.projectedPayoffDate)
                  : '-'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Paid</Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatCurrency(plan.summary.totalPaid)}
              </Typography>
            </Paper>
          </Box>

          {/* Payoff Order Timeline */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Payoff Order
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {plan.summary.payoffOrder.map((item, idx) => (
                <Chip
                  key={item.id}
                  label={`${idx + 1}. ${item.name} (Month ${item.month})`}
                  variant="outlined"
                  color={idx === 0 ? 'primary' : 'default'}
                  sx={{ fontWeight: idx === 0 ? 600 : 400 }}
                />
              ))}
            </Box>
          </Paper>

          {/* Monthly Breakdown */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Monthly Breakdown
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Click a row to see per-debt details
            </Typography>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width={40} />
                    <TableCell>Month</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Total Payment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plan.plan.map((month) => (
                    <React.Fragment key={month.month}>
                      <TableRow
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() =>
                          setExpandedMonth(expandedMonth === month.month ? null : month.month)
                        }
                      >
                        <TableCell>
                          <IconButton size="small">
                            {expandedMonth === month.month ? (
                              <ExpandLess fontSize="small" />
                            ) : (
                              <ExpandMore fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>{month.month}</TableCell>
                        <TableCell>{month.date}</TableCell>
                        <TableCell align="right">{formatCurrency(month.totalPayment)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                          <Collapse in={expandedMonth === month.month}>
                            <Box sx={{ p: 1, pl: 6, backgroundColor: '#f5f5f5' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Debt</TableCell>
                                    <TableCell align="right">Payment</TableCell>
                                    <TableCell align="right">Principal</TableCell>
                                    <TableCell align="right">Interest</TableCell>
                                    <TableCell align="right">Balance</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {month.debts.map((d) => (
                                    <TableRow key={d.id}>
                                      <TableCell>{d.name}</TableCell>
                                      <TableCell align="right">{formatCurrency(d.payment)}</TableCell>
                                      <TableCell align="right">{formatCurrency(d.principal)}</TableCell>
                                      <TableCell align="right">{formatCurrency(d.interest)}</TableCell>
                                      <TableCell align="right">
                                        <Typography
                                          variant="body2"
                                          color={d.balance <= 0 ? 'success.main' : 'inherit'}
                                          fontWeight={d.balance <= 0 ? 600 : 400}
                                        >
                                          {formatCurrency(d.balance)}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default SnowballPlanView;
