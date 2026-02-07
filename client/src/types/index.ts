export type IncomeType = 'salary' | 'freelance' | 'dividend' | 'rental' | 'rsu_vesting' | 'other';

export type VestPeriod = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export type ExpenseCategory = 'housing' | 'transport' | 'utilities' | 'subscriptions' | 'loan' | 'other';

export type DailyExpenseCategory = 'food' | 'groceries' | 'entertainment' | 'shopping' | 'travel' | 'health' | 'personal' | 'other';

export type InvestmentType = 'sip' | 'voluntary';

export type InvestmentCategory = 'mutual_fund' | 'stocks' | 'crypto' | 'other';

export type InvestmentStatus = 'active' | 'paused' | 'stopped';

export type AssetCategory = 'stocks' | 'mutual_fund' | 'crypto' | 'fd' | 'real_estate' | 'rsu' | 'other';

export interface Income {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  preTaxAmount?: number;
  postTaxAmount?: number;
  taxPaid?: number;
  currency: string;
  type: IncomeType;
  // RSU vesting specific fields
  units?: number;
  unitPrice?: number;
  vestPeriod?: VestPeriod;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyExpense {
  _id: string;
  userId: string;
  amount: number;
  description: string;
  vendor: string;
  category: DailyExpenseCategory;
  date: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyExpenseSummary {
  today: number;
  thisMonth: number;
  categoryBreakdown: {
    category: DailyExpenseCategory;
    total: number;
    count: number;
  }[];
}

export interface Investment {
  _id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  amount: number;
  currency: string;
  platform: string;
  category: InvestmentCategory;
  status: InvestmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ValueHistoryEntry {
  date: string;
  valueINR: number;
  valueUSD?: number;
}

export interface Asset {
  _id: string;
  userId: string;
  name: string;
  category: AssetCategory;
  quantity: number;
  unitPrice?: number;
  currentValueINR: number;
  currentValueUSD: number;
  currency: string;
  platform: string;
  valueHistory: ValueHistoryEntry[];
  isSold: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRates {
  USD: number;
  EUR?: number;
  [key: string]: number | undefined;
}

export interface EmailPreferences {
  weeklyExpenseSummary: boolean;
}

export interface UserSettings {
  currency: string;
  exchangeRates: ExchangeRates;
  theme: 'light' | 'dark';
  emailPreferences?: EmailPreferences;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  totalSIPs: number;
  totalVoluntaryInvestments: number;
  remaining: number;
  totalAssetValueINR: number;
  totalAssetValueUSD: number;
  dailyExpensesToday: number;
  dailyExpensesThisMonth: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  incomes: Income[];
  expenses: Expense[];
  investments: Investment[];
  assets: Asset[];
}

export interface Snapshot {
  _id: string;
  userId: string;
  month: string;
  totalIncome: number;
  totalExpenses: number;
  totalSIPs: number;
  totalVoluntaryInvestments: number;
  remaining: number;
  totalAssetValue: number;
  createdAt: string;
}

export type LedgerStatus = 'draft' | 'finalized';
export type LedgerSection = 'incomes' | 'expenses' | 'investments';

export interface LedgerIncomeItem {
  _id: string;
  sourceId: string | null;
  name: string;
  amount: number;
  preTaxAmount?: number;
  postTaxAmount?: number;
  taxPaid?: number;
  currency: string;
  type: IncomeType;
  units?: number;
  unitPrice?: number;
  vestPeriod?: VestPeriod;
}

export interface LedgerExpenseItem {
  _id: string;
  sourceId: string | null;
  name: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  isRecurring: boolean;
}

export interface LedgerInvestmentItem {
  _id: string;
  sourceId: string | null;
  name: string;
  type: InvestmentType;
  amount: number;
  currency: string;
  platform: string;
  category: InvestmentCategory;
  status: InvestmentStatus;
}

export interface MonthlyLedger {
  _id: string;
  userId: string;
  month: string;
  status: LedgerStatus;
  incomes: LedgerIncomeItem[];
  expenses: LedgerExpenseItem[];
  investments: LedgerInvestmentItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyLedgerResponse {
  ledger: MonthlyLedger;
  dailyExpensesTotal: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TelegramStatus {
  linked: boolean;
  username: string | null;
}

export interface TelegramVerifyResponse {
  linked: boolean;
  username: string | null;
}

export interface TelegramUnlinkResponse {
  linked: boolean;
  message: string;
}

// Weekly Analytics Types
export interface CategoryBreakdown {
  category: DailyExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface VendorBreakdown {
  vendor: string;
  total: number;
  count: number;
}

export interface DailyBreakdown {
  date: string;
  dayName: string;
  total: number;
  count: number;
}

export interface WeekComparison {
  currentWeekTotal: number;
  previousWeekTotal: number;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'same';
}

export interface WeeklyExpenseAnalytics {
  weekStart: string;
  weekEnd: string;
  totalSpent: number;
  transactionCount: number;
  avgDailySpend: number;
  categoryBreakdown: CategoryBreakdown[];
  topVendors: VendorBreakdown[];
  dailyBreakdown: DailyBreakdown[];
  highestSpendingDay: DailyBreakdown | null;
  lowestSpendingDay: DailyBreakdown | null;
  topCategory: CategoryBreakdown | null;
  weekComparison: WeekComparison;
}

export interface SendWeeklySummaryResponse {
  message: string;
  sentTo: string;
  weekStart: string;
  weekEnd: string;
}
