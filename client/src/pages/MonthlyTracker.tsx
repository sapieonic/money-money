import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import {
  AccountBalance,
  Receipt,
  TrendingUp,
  Savings,
  AttachMoney,
  ShoppingCart,
} from '@mui/icons-material';
import SummaryCard from '../components/common/SummaryCard';
import LedgerSection from '../components/monthly-tracker/LedgerSection';
import IncomeForm from '../components/income/IncomeForm';
import RSUVestingForm from '../components/income/RSUVestingForm';
import ExpenseForm from '../components/expenses/ExpenseForm';
import InvestmentForm from '../components/investments/InvestmentForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { monthlyLedgerService } from '../services/monthlyLedgerService';
import { dailyExpenseService } from '../services/dailyExpenseService';
import { settingsService } from '../services/settingsService';
import type {
  MonthlyLedger,
  LedgerSection as LedgerSectionType,
  LedgerIncomeItem,
  LedgerExpenseItem,
  LedgerInvestmentItem,
  DailyExpense,
  Income,
  Expense,
  Investment,
} from '../types';
import { formatCurrency, capitalizeFirst, formatDate } from '../utils/formatters';
import { categoryColors, expenseCategoryColors, dailyExpenseCategoryColors } from '../theme/theme';

const incomeTypeColors: Record<string, string> = {
  salary: '#4caf50',
  freelance: '#2196f3',
  dividend: '#9c27b0',
  rental: '#ff9800',
  rsu_vesting: '#00bcd4',
  other: '#607d8b',
};

const investmentCategoryColors: Record<string, string> = {
  mutual_fund: '#2196f3',
  stocks: '#4caf50',
  crypto: '#ff9800',
  other: '#607d8b',
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const MonthlyTracker: React.FC = () => {
  const [month, setMonth] = useState(getCurrentMonth());
  const [ledger, setLedger] = useState<MonthlyLedger | null>(null);
  const [dailyExpensesTotal, setDailyExpensesTotal] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(89);

  // Form state
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [rsuFormOpen, setRsuFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [investmentFormOpen, setInvestmentFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ section: LedgerSectionType; item: { _id: string; name: string } } | null>(null);

  useEffect(() => {
    loadData();
  }, [month]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [year, monthNum] = month.split('-').map(Number);
      const lastDay = new Date(year, monthNum, 0).getDate();
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

      const [ledgerResult, dailyExpensesResult] = await Promise.all([
        monthlyLedgerService.getOrCreate(month),
        dailyExpenseService.getAll({ startDate, endDate, limit: 200 }),
      ]);

      setLedger(ledgerResult.ledger);
      setDailyExpensesTotal(ledgerResult.dailyExpensesTotal);
      setDailyExpenses(dailyExpensesResult.items);
      setError(null);
    } catch (err) {
      setError('Failed to load monthly ledger');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await settingsService.get();
      setExchangeRate(settings.exchangeRates.USD || 89);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = (section: LedgerSectionType) => {
    setEditingItem(null);
    if (section === 'incomes') {
      setIncomeFormOpen(true);
    } else if (section === 'expenses') {
      setExpenseFormOpen(true);
    } else {
      setInvestmentFormOpen(true);
    }
  };

  const handleEdit = (section: LedgerSectionType, item: Record<string, unknown>) => {
    setEditingItem(item);
    if (section === 'incomes') {
      const incomeItem = item as unknown as LedgerIncomeItem;
      if (incomeItem.type === 'rsu_vesting') {
        setRsuFormOpen(true);
      } else {
        setIncomeFormOpen(true);
      }
    } else if (section === 'expenses') {
      setExpenseFormOpen(true);
    } else {
      setInvestmentFormOpen(true);
    }
  };

  const handleDelete = (section: LedgerSectionType, item: { _id: string; name: string }) => {
    setDeletingItem({ section, item });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      const updated = await monthlyLedgerService.removeItem(month, deletingItem.item._id, deletingItem.section);
      setLedger(updated);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIncomeSubmit = async (data: Partial<Income>) => {
    try {
      setSaving(true);
      if (editingItem) {
        await monthlyLedgerService.updateItem(month, (editingItem as { _id: string })._id, 'incomes', data as Record<string, unknown>);
      } else {
        await monthlyLedgerService.addItem(month, 'incomes', data as Record<string, unknown>);
      }
      setIncomeFormOpen(false);
      setRsuFormOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExpenseSubmit = async (data: Partial<Expense>) => {
    try {
      setSaving(true);
      if (editingItem) {
        await monthlyLedgerService.updateItem(month, (editingItem as { _id: string })._id, 'expenses', data as Record<string, unknown>);
      } else {
        await monthlyLedgerService.addItem(month, 'expenses', data as Record<string, unknown>);
      }
      setExpenseFormOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleInvestmentSubmit = async (data: Partial<Investment>) => {
    try {
      setSaving(true);
      if (editingItem) {
        await monthlyLedgerService.updateItem(month, (editingItem as { _id: string })._id, 'investments', data as Record<string, unknown>);
      } else {
        await monthlyLedgerService.addItem(month, 'investments', data as Record<string, unknown>);
      }
      setInvestmentFormOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Helper to get income amount in INR
  const getIncomeINR = (inc: LedgerIncomeItem) => {
    if (inc.type === 'rsu_vesting' && inc.currency === 'USD') {
      return inc.amount * exchangeRate;
    }
    return inc.amount;
  };

  // Calculate totals
  const totalIncome = ledger?.incomes.reduce((sum, inc) => sum + getIncomeINR(inc), 0) || 0;
  const totalExpenses = ledger?.expenses.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const totalSIPs = ledger?.investments
    .filter((inv) => inv.type === 'sip')
    .reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const totalInvestments = ledger?.investments
    .filter((inv) => inv.type === 'voluntary')
    .reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const remaining = totalIncome - totalExpenses - totalSIPs - totalInvestments - dailyExpensesTotal;

  // Map daily expenses to LedgerSection-compatible items
  const dailyExpenseItems = dailyExpenses.map((de) => ({
    _id: de._id,
    sourceId: de._id,
    name: `${de.description}${de.vendor ? ` (${de.vendor})` : ''}`,
    amount: de.amount,
    currency: de.currency,
    category: de.category,
    date: de.date,
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Monthly Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track income, expenses, and investments for each month
          </Typography>
        </Box>
        <TextField
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          size="small"
          sx={{ width: 200 }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Total Income"
            amount={totalIncome}
            color={categoryColors.income}
            icon={<AccountBalance />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Expenses"
            amount={totalExpenses}
            color={categoryColors.expenses}
            icon={<Receipt />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="SIPs"
            amount={totalSIPs}
            color={categoryColors.sip}
            icon={<TrendingUp />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Investments"
            amount={totalInvestments}
            color={categoryColors.voluntary}
            icon={<Savings />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Daily Expenses"
            amount={dailyExpensesTotal}
            color="#ef5350"
            icon={<ShoppingCart />}
            compact
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <SummaryCard
            title="Remaining"
            amount={remaining}
            color={categoryColors.remaining}
            icon={<AttachMoney />}
            compact
          />
        </Grid>
      </Grid>

      {/* Ledger Sections */}
      {ledger && (
        <>
          <LedgerSection
            title="Income Sources"
            items={ledger.incomes as unknown as Array<{ _id: string; sourceId: string | null; name: string; amount: number; [key: string]: unknown }>}
            sectionKey="incomes"
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatAmount={(amount, currency) => formatCurrency(amount, currency || 'INR')}
            getChipLabel={(item) => capitalizeFirst((item as unknown as LedgerIncomeItem).type)}
            getChipColor={(item) => incomeTypeColors[(item as unknown as LedgerIncomeItem).type] || incomeTypeColors.other}
          />

          <LedgerSection
            title="Monthly Expenses"
            items={ledger.expenses as unknown as Array<{ _id: string; sourceId: string | null; name: string; amount: number; [key: string]: unknown }>}
            sectionKey="expenses"
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatAmount={(amount) => formatCurrency(amount)}
            getChipLabel={(item) => capitalizeFirst((item as unknown as LedgerExpenseItem).category)}
            getChipColor={(item) => expenseCategoryColors[(item as unknown as LedgerExpenseItem).category] || expenseCategoryColors.other}
          />

          <LedgerSection
            title="Investments"
            items={ledger.investments as unknown as Array<{ _id: string; sourceId: string | null; name: string; amount: number; [key: string]: unknown }>}
            sectionKey="investments"
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatAmount={(amount) => formatCurrency(amount)}
            getChipLabel={(item) => {
              const inv = item as unknown as LedgerInvestmentItem;
              return `${capitalizeFirst(inv.type)} - ${capitalizeFirst(inv.category)}`;
            }}
            getChipColor={(item) => investmentCategoryColors[(item as unknown as LedgerInvestmentItem).category] || investmentCategoryColors.other}
          />

          <LedgerSection
            title="Daily Expenses"
            items={dailyExpenseItems}
            sectionKey="expenses"
            readOnly
            defaultExpanded={false}
            subtitle={`Total: ${formatCurrency(dailyExpensesTotal)}`}
            formatAmount={(amount) => formatCurrency(amount)}
            getChipLabel={(item) => {
              const de = item as unknown as { category: string; date: string };
              return `${capitalizeFirst(de.category)} - ${formatDate(de.date)}`;
            }}
            getChipColor={(item) => {
              const de = item as unknown as { category: string };
              return dailyExpenseCategoryColors[de.category] || dailyExpenseCategoryColors.other;
            }}
          />
        </>
      )}

      {/* Form Dialogs */}
      <IncomeForm
        open={incomeFormOpen}
        onClose={() => setIncomeFormOpen(false)}
        onSubmit={handleIncomeSubmit}
        initialData={editingItem as Income | null}
        loading={saving}
      />

      <RSUVestingForm
        open={rsuFormOpen}
        onClose={() => setRsuFormOpen(false)}
        onSubmit={handleIncomeSubmit}
        initialData={editingItem as Income | null}
        loading={saving}
        exchangeRate={exchangeRate}
      />

      <ExpenseForm
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        onSubmit={handleExpenseSubmit}
        initialData={editingItem as Expense | null}
        loading={saving}
      />

      <InvestmentForm
        open={investmentFormOpen}
        onClose={() => setInvestmentFormOpen(false)}
        onSubmit={handleInvestmentSubmit}
        initialData={editingItem as Investment | null}
        loading={saving}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${deletingItem?.item.name}"? This only affects this month's ledger.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </Box>
  );
};

export default MonthlyTracker;
