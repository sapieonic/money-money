import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Payment, Delete } from '@mui/icons-material';
import type { Debt, DebtAmortizationResponse } from '../../types';
import { debtService } from '../../services/debtService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { debtStatusColors } from '../../theme/theme';
import AdhocPaymentForm from './AdhocPaymentForm';
import ConfirmDialog from '../common/ConfirmDialog';

interface DebtDetailModalProps {
  open: boolean;
  onClose: () => void;
  debt: Debt | null;
  onPaymentRecorded: () => void;
}

const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  open,
  onClose,
  debt,
  onPaymentRecorded,
}) => {
  const [tab, setTab] = useState(0);
  const [amortization, setAmortization] = useState<DebtAmortizationResponse | null>(null);
  const [amortLoading, setAmortLoading] = useState(false);
  const [amortError, setAmortError] = useState<string | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (open && debt && tab === 1) {
      loadAmortization();
    }
  }, [open, debt, tab]);

  useEffect(() => {
    if (open) {
      setTab(0);
      setAmortization(null);
    }
  }, [open]);

  const loadAmortization = async () => {
    if (!debt) return;
    try {
      setAmortLoading(true);
      setAmortError(null);
      const data = await debtService.getAmortization(debt._id);
      setAmortization(data);
    } catch {
      setAmortError('Failed to load amortization schedule');
    } finally {
      setAmortLoading(false);
    }
  };

  const handleRecordPayment = async (data: { amount: number; date?: string; note?: string }) => {
    if (!debt) return;
    try {
      setPaymentLoading(true);
      await debtService.recordPayment(debt._id, data);
      setPaymentFormOpen(false);
      onPaymentRecorded();
    } catch {
      console.error('Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePaymentClick = (paymentId: string) => {
    setDeletingPaymentId(paymentId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeletePayment = async () => {
    if (!debt || !deletingPaymentId) return;
    try {
      setDeleteLoading(true);
      await debtService.deletePayment(debt._id, deletingPaymentId);
      setDeleteConfirmOpen(false);
      setDeletingPaymentId(null);
      onPaymentRecorded();
    } catch {
      console.error('Failed to delete payment');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!debt) return null;

  const statusColor = debtStatusColors[debt.status] || '#90a4ae';
  const progress = ((debt.totalAmount - debt.currentBalance) / debt.totalAmount) * 100;
  const deletingPayment = deletingPaymentId
    ? debt.paymentHistory.find((p) => p._id === deletingPaymentId)
    : null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">{debt.name}</Typography>
            <Chip
              label={debt.status.replace('_', ' ')}
              size="small"
              sx={{
                backgroundColor: `${statusColor}20`,
                color: statusColor,
                fontWeight: 600,
                textTransform: 'capitalize',
                mt: 0.5,
              }}
            />
          </Box>
          {debt.status === 'active' && (
            <Button
              variant="outlined"
              startIcon={<Payment />}
              onClick={() => setPaymentFormOpen(true)}
              size="small"
            >
              Record Payment
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Summary" />
            <Tab label="Amortization" />
            <Tab label="Payment History" />
          </Tabs>

          {tab === 0 && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Total Principal</Typography>
                  <Typography variant="h6" fontWeight={600}>{formatCurrency(debt.totalAmount)}</Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Current Balance</Typography>
                  <Typography variant="h6" fontWeight={600} color="error.main">
                    {formatCurrency(debt.currentBalance)}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Interest Rate</Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {debt.interestRate}% ({debt.interestRateType})
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Monthly EMI</Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {formatCurrency(debt.monthlyPayment)}
                    {debt.additionalPayment > 0 && (
                      <Typography component="span" variant="body2" color="success.main">
                        {' '}+{formatCurrency(debt.additionalPayment)}
                      </Typography>
                    )}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Start Date</Typography>
                  <Typography variant="body1">{formatDate(debt.startDate)}</Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Projected Payoff</Typography>
                  <Typography variant="body1">{formatDate(debt.endDate)}</Typography>
                </Paper>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Repayment Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1, height: 12, borderRadius: 6, backgroundColor: '#e0e0e0', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${Math.min(progress, 100)}%`,
                        height: '100%',
                        backgroundColor: progress >= 100 ? '#4caf50' : '#2196f3',
                        borderRadius: 6,
                        transition: 'width 0.3s',
                      }}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    {Math.round(progress)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {formatCurrency(debt.totalAmount - debt.currentBalance)} paid of {formatCurrency(debt.totalAmount)}
                </Typography>
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box>
              {amortLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              )}
              {amortError && <Alert severity="error" sx={{ mb: 2 }}>{amortError}</Alert>}
              {amortization && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Paper sx={{ p: 1.5, flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">Total Interest</Typography>
                      <Typography variant="body1" fontWeight={600} color="error.main">
                        {formatCurrency(amortization.totalInterest)}
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: 1.5, flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">Total Payable</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(amortization.totalPaid)}
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: 1.5, flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">Months Remaining</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {amortization.months}
                      </Typography>
                    </Paper>
                  </Box>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Month</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Payment</TableCell>
                          <TableCell align="right">Principal</TableCell>
                          <TableCell align="right">Interest</TableCell>
                          <TableCell align="right">Balance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {amortization.schedule.map((entry) => (
                          <TableRow key={entry.month}>
                            <TableCell>{entry.month}</TableCell>
                            <TableCell>{entry.date}</TableCell>
                            <TableCell align="right">{formatCurrency(entry.payment)}</TableCell>
                            <TableCell align="right">{formatCurrency(entry.principal)}</TableCell>
                            <TableCell align="right">{formatCurrency(entry.interest)}</TableCell>
                            <TableCell align="right">{formatCurrency(entry.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}

          {tab === 2 && (
            <Box>
              {debt.paymentHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No payments recorded yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Principal</TableCell>
                        <TableCell align="right">Interest</TableCell>
                        <TableCell align="right">Balance After</TableCell>
                        <TableCell>Note</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...debt.paymentHistory].reverse().map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>
                            <Chip
                              label={payment.type}
                              size="small"
                              color={payment.type === 'adhoc' ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell align="right">{formatCurrency(payment.principal)}</TableCell>
                          <TableCell align="right">{formatCurrency(payment.interest)}</TableCell>
                          <TableCell align="right">{formatCurrency(payment.balanceAfter)}</TableCell>
                          <TableCell>{payment.note || '-'}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Delete payment">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePaymentClick(payment._id)}
                                disabled={deleteLoading}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      <AdhocPaymentForm
        open={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        onSubmit={handleRecordPayment}
        loading={paymentLoading}
        maxAmount={debt.currentBalance}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Payment"
        message={
          deletingPayment
            ? `Are you sure you want to delete this ${deletingPayment.type} payment of ${formatCurrency(deletingPayment.amount)}? The principal (${formatCurrency(deletingPayment.principal)}) will be added back to the debt balance.`
            : 'Are you sure you want to delete this payment?'
        }
        confirmText={deleteLoading ? 'Deleting...' : 'Delete'}
        onConfirm={handleConfirmDeletePayment}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeletingPaymentId(null);
        }}
        isDestructive
      />
    </>
  );
};

export default DebtDetailModal;
