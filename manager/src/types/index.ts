import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export interface UserInfo {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthenticatedEvent extends APIGatewayProxyEventV2 {
  userId?: string;
  userInfo?: UserInfo;
}

export type LambdaHandler = (
  event: AuthenticatedEvent
) => Promise<APIGatewayProxyResultV2>;

export type IncomeType = 'salary' | 'freelance' | 'dividend' | 'rental' | 'rsu_vesting' | 'other';

export type VestPeriod = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export type ExpenseCategory = 'housing' | 'transport' | 'utilities' | 'subscriptions' | 'loan' | 'other';

export type InvestmentType = 'sip' | 'voluntary';

export type InvestmentCategory = 'mutual_fund' | 'stocks' | 'crypto' | 'other';

export type InvestmentStatus = 'active' | 'paused' | 'stopped';

export type AssetCategory = 'stocks' | 'mutual_fund' | 'crypto' | 'fd' | 'real_estate' | 'rsu' | 'other';

export interface ValueHistoryEntry {
  date: Date;
  valueINR: number;
  valueUSD?: number;
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
}
