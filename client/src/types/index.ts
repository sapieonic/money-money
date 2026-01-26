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

export interface UserSettings {
  currency: string;
  exchangeRates: ExchangeRates;
  theme: 'light' | 'dark';
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
