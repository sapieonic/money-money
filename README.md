# Finance Watch

A full-stack personal finance management application to track income, expenses, investments, and assets with comprehensive tax tracking and multi-currency support.

## Features

### Income Management
- Track multiple income sources (salary, freelance, dividends, rental, etc.)
- **Pre-tax and post-tax tracking** with automatic tax calculation
- **RSU/Equity vesting support** with unit price, vesting period, and currency conversion
- Effective tax rate calculation

### Expense Tracking
- Categorize expenses (housing, transport, utilities, subscriptions, loans, etc.)
- Recurring vs one-time expense tracking
- **Due date tracking** - Set payment due dates (day of month) for recurring expenses
- **Automated reminders** - Daily Telegram notifications at 6:45 PM IST for expenses due tomorrow
- Monthly expense summaries

### Daily Expense Tracking
- Track day-to-day expenses (food, groceries, entertainment, shopping, travel, health, personal)
- **Date range filtering** with quick presets (Today, This Week, This Month)
- **Category-based filtering** for focused analysis
- Grouped view by date with daily totals
- Vendor tracking for better expense categorization
- Dashboard integration showing today's and monthly totals

### Investment Portfolio
- **SIP (Systematic Investment Plan)** tracking
- **Voluntary investments** tracking
- Investment status management (active, paused, stopped)
- Platform and category organization

### Asset Management
- Track various asset types (stocks, mutual funds, crypto, FDs, real estate, RSUs)
- **Multi-currency support** (INR/USD) with configurable exchange rates
- Asset value history tracking
- RSU-specific tracking with units and unit price

### Debt Snowball Calculator
- Track all loans — home, car, personal, credit card, etc.
- **Interest rate types** — fixed, reducing balance, variable
- **Amortization schedules** — on-demand month-by-month breakdown (principal, interest, balance)
- **Ad-hoc payments** — record lump-sum payments that go directly to principal
- **Payment history** — full audit trail with add and delete support; deleting a payment reverses the balance
- **Snowball & Avalanche strategies** — compare payoff plans side-by-side
  - Snowball: smallest balance first for quick wins
  - Avalanche: highest interest rate first to minimise total interest
  - Projected payoff dates, total interest, and debt payoff order
- **Smart expense linking** — auto-creates a linked recurring `loan` expense on debt creation, or link an existing expense
- **Scheduled payment processing** — runs every 4 days to apply EMI payments automatically

### Telegram Bot Integration
- **AI-powered expense parsing** using LLM (Azure OpenAI, with extensible architecture)
- **Automatic expense tracking** via forwarded bank SMS messages
- **Smart categorization** - automatically categorizes expenses based on vendor/description
- Secure account linking with 6-digit verification codes
- Instant confirmation messages for added expenses
- Fallback regex parsing when LLM is not configured
- Easy setup through Settings page

### Weekly Email Summary
- **Automated weekly reports** sent every Monday at 9 AM IST
- **Spending breakdown** by category with percentages
- **Top vendors** analysis
- **Week-over-week comparison** showing spending trends
- **Daily breakdown** showing highest/lowest spending days
- Opt-in/opt-out toggle in Settings
- **Manual trigger** - send summary instantly from Daily Expenses page

### Weekly Analytics Dashboard
- **Interactive pie charts** showing category and vendor distribution
- **Real-time analytics** for the current week
- Quick stats: daily average, top category, week comparison
- Visual spending trends

### Monthly Tracker
- **Per-month ledger** — clones active templates on first access, then tracks month-specific changes
- Add, edit, or remove income, expense, and investment items for any month without affecting global templates
- **Ad-hoc items** — add one-off entries (e.g., a bonus, extra bill) that only appear in that month
- Summary cards: Total Income, Expenses, SIPs, Investments, Daily Expenses, Remaining
- Month picker to navigate between months
- **Dashboard integration** — dashboard summary automatically uses ledger data for the current month when available
- **Dual View Modes**:
  - **Calendar View** - Visual month calendar showing daily expenses and recurring payment due dates with color-coded day status (past/current/upcoming)
  - **Detailed View** - Traditional list view with all ledger sections for detailed management

### Dashboard
- Visual allocation breakdown with donut chart
- Income sources with tax breakdown per entry
- Quick stats (effective tax rate, savings rate, investment rate)
- Asset portfolio summary in multiple currencies
- Daily expense summary (today and this month)

## Tech Stack

### Frontend (`client/`)
- **React 19** with TypeScript
- **Material UI (MUI) v7** for UI components
- **Recharts** for data visualization
- **Vite 7** for build tooling
- **React Query v5** for server state management
- **Firebase** for authentication (Google Sign-in)

### Backend (`manager/`)
- **AWS Lambda** with Serverless Framework v4
- **TypeScript**
- **MongoDB** with Mongoose v9 ODM
- **Firebase Admin SDK** for token verification
- **LLM Integration** - Pluggable LLM providers (Azure OpenAI, with factory pattern for extensibility)
- **Email Service** - Pluggable email providers (Mailjet, with factory pattern for extensibility)
- **Telegram Bot** - Expense tracking and automated reminders via Telegram
- **Scheduled Jobs** - CloudWatch Events for automated tasks:
  - Daily expense reminders (6:45 PM IST)
  - Daily AI expense digests (9:30 PM IST)
  - Weekly email summaries (Mondays at 9 AM IST)
  - Debt payment processing (every 4 days)

## Project Structure

```
money-money/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Shared components (Sidebar, etc.)
│   │   │   ├── income/        # Income-related components
│   │   │   ├── expenses/      # Expense-related components
│   │   │   ├── daily-expenses/# Daily expense components
│   │   │   ├── investments/   # Investment-related components
│   │   │   ├── assets/        # Asset-related components
│   │   │   ├── debts/         # Debt management components
│   │   │   │   ├── DebtForm.tsx          # Add/Edit debt dialog
│   │   │   │   ├── DebtTable.tsx         # Debt list with progress bars
│   │   │   │   ├── DebtDetailModal.tsx   # Detail view with amortization & history
│   │   │   │   ├── AdhocPaymentForm.tsx  # Record ad-hoc payment dialog
│   │   │   │   └── SnowballPlanView.tsx  # Strategy comparison view
│   │   │   └── monthly-tracker/ # Monthly tracker components
│   │   │       ├── LedgerSection.tsx   # Ledger list view
│   │   │       └── CalendarView.tsx    # Calendar view with expenses
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service functions
│   │   ├── context/           # React context (Auth)
│   │   ├── theme/             # MUI theme configuration
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Utility functions
│   └── package.json
│
├── manager/                    # AWS Lambda Backend
│   ├── src/
│   │   ├── handlers/          # Lambda function handlers
│   │   ├── models/            # Mongoose schemas
│   │   ├── services/          # Business logic
│   │   │   ├── telegram.ts    # Telegram bot utilities
│   │   │   ├── llm/           # LLM provider implementations
│   │   │   │   ├── types.ts   # LLM interfaces and types
│   │   │   │   ├── factory.ts # Provider factory
│   │   │   │   ├── dailyNarrative.ts    # Daily expense digest AI
│   │   │   │   ├── expenseReminder.ts   # Expense reminder AI
│   │   │   │   └── providers/ # Provider implementations
│   │   │   ├── email/         # Email provider implementations
│   │   │   │   ├── types.ts   # Email interfaces
│   │   │   │   ├── factory.ts # Provider factory
│   │   │   │   ├── providers/ # Provider implementations (Mailjet, etc.)
│   │   │   │   └── templates/ # Email templates
│   │   │   └── analytics/     # Analytics services
│   │   │       └── weeklyExpenseAnalytics.ts
│   │   ├── scripts/           # Utility scripts
│   │   │   ├── notify-missing-due-dates.ts  # One-time notification script
│   │   │   ├── send-feature-promo.ts        # Feature promo via Telegram & Email
│   │   │   ├── promo.txt                    # Telegram promo template
│   │   │   └── promo-email.txt              # HTML email promo template
│   │   ├── middleware/        # Auth middleware
│   │   ├── utils/             # Database & response utilities
│   │   └── types/             # TypeScript interfaces
│   ├── serverless.yml         # Serverless configuration
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas account
- Firebase project with Google Sign-in enabled
- AWS account (for deployment)
- Telegram Bot Token (optional, for Telegram integration)
- Azure OpenAI account (optional, for AI-powered expense parsing)

### Environment Setup

#### Backend (`manager/.env`)
```env
# Required
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
MONGODB_DB_NAME=finance-watch
FIREBASE_PROJECT_ID=your-firebase-project-id

# Telegram Integration (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# LLM Configuration (Optional - for AI-powered parsing)
# Supported: azure-openai, databricks-claude, none
# Auto-detects from available credentials if not set
LLM_PROVIDER=azure-openai

# Azure OpenAI (Required if LLM_PROVIDER=azure-openai)
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Databricks Claude (Required if LLM_PROVIDER=databricks-claude)
DATABRICKS_HOST=https://adb-xxxxxxx.x.azuredatabricks.net
DATABRICKS_TOKEN=your-databricks-personal-access-token
DATABRICKS_SERVING_ENDPOINT=databricks-claude-sonnet-4-6  # optional

# Email Configuration (Optional - for weekly summaries)
EMAIL_PROVIDER=mailjet  # or leave empty for console logging

# Mailjet (Required if EMAIL_PROVIDER=mailjet)
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_SECRET_KEY=your-mailjet-secret-key
MAILJET_FROM_EMAIL=noreply@yourdomain.com
MAILJET_FROM_NAME=Finance Watch
```

#### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:3000/dev
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd money-money
   ```

2. **Install backend dependencies**
   ```bash
   cd manager
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Running Locally

1. **Start the backend**
   ```bash
   cd manager
   npm run dev
   # Runs on http://localhost:3000
   ```

2. **Start the frontend**
   ```bash
   cd client
   npm run dev
   # Runs on http://localhost:5173
   ```

### Deployment

#### Backend (AWS Lambda)
```bash
cd manager
serverless deploy --stage prod
```

#### Frontend
Build and deploy to your preferred hosting (Vercel, Netlify, S3, etc.):
```bash
cd client
npm run build
```

## API Endpoints

### Income
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/income` | Get all income sources |
| POST | `/api/income` | Create income source |
| PUT | `/api/income/{id}` | Update income source |
| DELETE | `/api/income/{id}` | Delete income source |

### Expenses (Recurring)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | Get all expenses |
| POST | `/api/expenses` | Create expense (supports optional `dueDate` field: 1-31) |
| PUT | `/api/expenses/{id}` | Update expense (supports optional `dueDate` field: 1-31) |
| DELETE | `/api/expenses/{id}` | Delete expense |

### Daily Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/daily-expenses` | Get all daily expenses (supports `startDate`, `endDate`, `category` query params) |
| GET | `/api/daily-expenses/summary` | Get summary (today's total, month total, category breakdown) |
| GET | `/api/daily-expenses/weekly-analytics` | Get current week's spending analytics with breakdowns |
| POST | `/api/daily-expenses` | Create daily expense |
| POST | `/api/daily-expenses/send-weekly-summary` | Send weekly summary email to user |
| PUT | `/api/daily-expenses/{id}` | Update daily expense |
| DELETE | `/api/daily-expenses/{id}` | Delete daily expense |

### Investments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investments` | Get all investments |
| POST | `/api/investments` | Create investment |
| PUT | `/api/investments/{id}` | Update investment |
| PATCH | `/api/investments/{id}/status` | Toggle investment status |
| DELETE | `/api/investments/{id}` | Delete investment |

### Monthly Ledger
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monthly-ledger?month=YYYY-MM` | Get or create a monthly ledger (clones templates on first access) |
| POST | `/api/monthly-ledger/{month}/items` | Add an item to a ledger section |
| PUT | `/api/monthly-ledger/{month}/items/{itemId}` | Update a ledger item |
| DELETE | `/api/monthly-ledger/{month}/items/{itemId}?section=X` | Remove a ledger item |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | Get all assets |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/{id}` | Update asset |
| PATCH | `/api/assets/{id}/value` | Update asset value |
| DELETE | `/api/assets/{id}` | Delete asset |

### Debts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/debts` | Get all debts (optional `?status=active\|paid_off\|paused` filter) |
| GET | `/api/debts/snowball-plan` | Compute snowball/avalanche projection (`?strategy=snowball\|avalanche`) |
| POST | `/api/debts` | Create debt (auto-creates linked expense, or pass `linkedExpenseId`) |
| PUT | `/api/debts/{id}` | Update debt (syncs linked expense) |
| DELETE | `/api/debts/{id}` | Soft-delete debt (deactivates linked expense) |
| POST | `/api/debts/{id}/payment` | Record ad-hoc payment (principal only) |
| DELETE | `/api/debts/{id}/payment/{paymentId}` | Delete a recorded payment (reverses balance) |
| GET | `/api/debts/{id}/amortization` | Compute full amortization schedule |

### Dashboard & Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get dashboard summary |
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |

### Telegram Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/telegram/webhook` | Webhook for Telegram bot messages |
| GET | `/api/telegram/status` | Check if user has linked Telegram |
| POST | `/api/telegram/verify-code` | Verify link code and connect account |
| DELETE | `/api/telegram/unlink` | Disconnect Telegram account |

## Key Features Explained

### Tax Tracking
Income entries support pre-tax and post-tax amounts. The system automatically calculates:
- Monthly tax paid per income source
- Effective tax rate across all income
- Tax component in the allocation pie chart

### RSU Vesting
RSU income is stored in its original currency (typically USD) and converted to INR at display time using the user's configured exchange rate. This ensures accurate tracking as stock prices fluctuate.

### Multi-Currency Support
- Assets and RSU income can be tracked in USD or INR
- Exchange rates are configurable per user in Settings
- Dashboard shows portfolio value in both currencies

### Daily Expense Categories
Daily expenses are categorized for better tracking and analysis:
- **Food** - Restaurants, cafes, food delivery
- **Groceries** - Supermarket, vegetables, daily essentials
- **Entertainment** - Movies, events, subscriptions
- **Shopping** - Clothing, electronics, household items
- **Travel** - Cab, fuel, public transport
- **Health** - Medicine, doctor visits, gym
- **Personal** - Personal care, miscellaneous
- **Other** - Uncategorized expenses

### LLM-Powered Expense Parsing

The system uses a pluggable LLM architecture for intelligent expense parsing:

#### Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Telegram Message│────▶│   LLM Factory    │────▶│  LLM Provider   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               │ Auto-detect or         │ Azure OpenAI
                               │ explicit config        │ (more coming)
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Fallback Provider│     │ Parsed Expense  │
                        │ (Regex-based)    │     │ with Category   │
                        └──────────────────┘     └─────────────────┘
```

#### Supported Providers
| Provider | Status | Configuration |
|----------|--------|---------------|
| Azure OpenAI | Implemented | `AZURE_OPENAI_*` env vars |
| Databricks Claude | Implemented | `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `DATABRICKS_SERVING_ENDPOINT` env vars |
| OpenAI | Planned | - |
| Anthropic | Planned | - |
| Fallback (Regex) | Default | No config needed |

#### Provider Selection
The system auto-detects the provider based on available credentials:
1. If `LLM_PROVIDER` is set explicitly, uses that provider
2. If `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` are set, uses Azure OpenAI
3. If `DATABRICKS_HOST` and `DATABRICKS_TOKEN` are set, uses Databricks Claude
4. Falls back to regex-based parsing if no LLM is configured

#### Adding New Providers
To add a new LLM provider:
1. Create a new file in `manager/src/services/llm/providers/`
2. Implement the `ILLMProvider` interface
3. Register the provider in `manager/src/services/llm/factory.ts`

### Email Service (Pluggable Providers)

The system uses a pluggable email provider architecture for sending weekly summaries:

#### Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Weekly Summary  │────▶│  Email Factory   │────▶│ Email Provider  │
│ Scheduler       │     └──────────────────┘     └─────────────────┘
└─────────────────┘            │                        │
                               │ Auto-detect or         │ Mailjet
                               │ explicit config        │ (more coming)
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Console Provider │     │ Email Sent      │
                        │ (Development)    │     └─────────────────┘
                        └──────────────────┘
```

#### Supported Providers
| Provider | Status | Configuration |
|----------|--------|---------------|
| Mailjet | Implemented | `MAILJET_*` env vars |
| AWS SES | Planned | - |
| SendGrid | Planned | - |
| Console | Default | No config (logs to console) |

#### Provider Selection
1. If `EMAIL_PROVIDER` is set explicitly, uses that provider
2. If `MAILJET_API_KEY` and `MAILJET_SECRET_KEY` are set, uses Mailjet
3. Falls back to console provider (logs emails, doesn't send)

#### Adding New Providers
To add a new email provider:
1. Create a new file in `manager/src/services/email/providers/`
2. Implement the `EmailProvider` interface
3. Register the provider in `manager/src/services/email/factory.ts`

### Telegram Bot Integration

The Telegram bot allows you to track expenses on-the-go by simply forwarding bank SMS messages.

#### Setup Instructions

1. **Create a Telegram Bot**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` and follow the prompts
   - Copy the bot token provided

2. **Configure the Backend**
   - Add `TELEGRAM_BOT_TOKEN=<your-token>` to `manager/.env`
   - (Optional) Configure Azure OpenAI for AI-powered parsing
   - Deploy the backend

3. **Register the Webhook**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<API_URL>/api/telegram/webhook"
   ```

4. **Link Your Account**
   - Open your bot in Telegram
   - Send `/link` to get a 6-digit code
   - Go to Settings in Finance Watch
   - Enter the code in the Telegram Integration section

5. **Start Tracking**
   - Forward any bank SMS to the bot
   - The bot uses AI (or regex fallback) to parse the expense
   - Automatically categorizes based on vendor/description
   - View your expenses in the Daily Expenses page

#### Azure OpenAI Setup

1. **Create Azure OpenAI Resource**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create an Azure OpenAI resource
   - Deploy a model (e.g., `gpt-4o-mini` or `gpt-35-turbo`)

2. **Get Credentials**
   - Navigate to your Azure OpenAI resource
   - Go to "Keys and Endpoint"
   - Copy the API key and endpoint

3. **Configure Environment**
   ```env
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

#### Databricks Claude Setup

1. **Get Databricks Workspace URL**
   - Navigate to your Azure Databricks workspace
   - Copy the workspace URL (e.g., `https://adb-xxxxxxx.x.azuredatabricks.net`)

2. **Generate Personal Access Token**
   - In Databricks, go to User Settings → Developer → Access Tokens
   - Generate a new token and copy it

3. **Configure Environment**
   ```env
   DATABRICKS_HOST=https://adb-xxxxxxx.x.azuredatabricks.net
   DATABRICKS_TOKEN=your-personal-access-token
   DATABRICKS_SERVING_ENDPOINT=databricks-claude-sonnet-4-6  # optional, this is the default
   ```

   > **Note:** Claude models on Databricks use `json_schema` structured outputs (not `json_object`). The provider handles this automatically.

#### Supported SMS Formats
The AI parser can intelligently extract information from various formats:
- `Rs.500 debited at Amazon` → Shopping, Amazon
- `INR 1,200.00 paid to Swiggy` → Food, Swiggy
- `Your a/c debited by Rs.250 at UBER` → Travel, Uber
- `Paid Rupees 100 to Apollo Pharmacy` → Health, Apollo Pharmacy

The LLM understands context and can categorize expenses accurately even with varied message formats.

### Recurring Expense Reminders

Never miss a payment deadline with automated daily reminders for recurring expenses.

#### Features
- **Due date tracking** - Set specific day of month (1-31) for each recurring expense
- **Daily notifications** - Automated Telegram messages at 6:45 PM IST for expenses due tomorrow
- **AI-powered messages** - Friendly, context-aware reminders using Azure OpenAI
- **Grouped notifications** - All expenses due on the same day sent in a single message
- **Category breakdown** - Expenses grouped by category for easy review
- **Calendar integration** - Due dates visible in Monthly Tracker calendar view

#### How It Works

1. **Set Due Dates**
   - Edit any recurring expense in the Expenses page
   - Set the "Due Date (Day of Month)" field (e.g., 1st, 15th, 28th)
   - Save the expense

2. **Receive Reminders**
   - Every day at 6:45 PM IST, the system checks for expenses due tomorrow
   - If you have expenses due, you'll receive a Telegram message
   - Message includes expense names, amounts, and categories
   - Total amount due is prominently displayed

3. **Example Message**
   ```
   Hey Manas! 👋

   💰 Expenses Due Tomorrow (Monday, Feb 17)

   You have 3 recurring expenses due:

   🏠 Housing
   • House Rent: ₹25,000

   🔌 Utilities
   • Electricity Bill: ₹2,500
   • Internet: ₹1,000

   Total: ₹28,500

   💡 Tip: Set up auto-pay for recurring bills to never miss a deadline!
   ```

#### Configuration

Expense reminders work automatically if you have:
- Telegram account linked (see Telegram Bot Integration above)
- Azure OpenAI configured (optional - falls back to template-based messages)
- Recurring expenses with due dates set

#### One-Time Notification Script

For existing users, run this script to notify about expenses missing due dates:

```bash
cd manager
npx ts-node scripts/notify-missing-due-dates.ts
```

This sends a one-time message to all Telegram-linked users who have recurring expenses without due dates, encouraging them to set them.

### Debt Snowball Calculator

Track and manage all your debts with smart payoff strategies to become debt-free faster.

#### Features
- **Full debt lifecycle** - Add, edit, delete debts with soft-delete support
- **Interest rate types** - Fixed (flat), reducing balance, variable, other
- **Amortization schedules** - Computed on-demand from current state; always up-to-date
- **Ad-hoc payments** - Record lump-sum payments (bonus, tax refund) that go directly to principal
- **Payment deletion** - Remove incorrect payments; balance is automatically reversed
- **Snowball strategy** - Pay off smallest balances first for motivational quick wins
- **Avalanche strategy** - Target highest interest rates first to minimise total interest paid
- **Strategy comparison** - Summary cards (total interest, months to payoff, projected date), payoff order timeline, collapsible monthly breakdown
- **Smart expense linking** - Auto-creates a linked recurring `loan` expense, or link an existing expense
- **Scheduled processing** - Automated EMI application every 4 days

#### How It Works

1. **Add a Debt**
   - Go to Debts page → "Add Debt"
   - Enter loan details: name, principal, balance, interest rate, EMI, dates
   - Optionally link an existing expense or let the system create one automatically

2. **Track Progress**
   - View all debts in the table with progress bars and status chips
   - Click a debt to see summary, amortization schedule, and full payment history

3. **Record Payments**
   - Click "Record Payment" in the debt detail view
   - Enter amount, date, and optional note
   - Balance updates automatically; debt marked as paid off when balance hits zero

4. **Compare Strategies**
   - Switch to "Payoff Strategy" tab
   - Toggle between Snowball and Avalanche
   - View projected payoff timeline and total interest for each approach

#### Utility Scripts

**Feature Promo** - Send announcement to all users about the new debt feature:
```bash
cd manager
npx ts-node scripts/send-feature-promo.ts                # Both Telegram & Email
npx ts-node scripts/send-feature-promo.ts --telegram      # Telegram only
npx ts-node scripts/send-feature-promo.ts --email         # Email only
```

Templates are stored in `manager/scripts/promo.txt` (Telegram) and `manager/scripts/promo-email.txt` (HTML email). Both support `{userName}` placeholder for personalisation.

### Weekly Email Summaries

The system sends automated weekly expense summaries to help you stay on top of your spending.

#### Features
- **Automated delivery** - Emails sent every Monday at 9 AM IST
- **Comprehensive breakdown** - Category spending with percentages
- **Vendor analysis** - Top 5 vendors you spent with
- **Trend tracking** - Week-over-week comparison
- **Daily breakdown** - See which days you spent most/least

#### Email Content
The weekly summary includes:
- Total spent this week
- Transaction count and daily average
- Category breakdown with visual progress bars
- Top vendors list
- Comparison with previous week (up/down percentage)
- Highest and lowest spending days

#### Configuration

1. **Set up Mailjet**
   - Create a [Mailjet account](https://www.mailjet.com/)
   - Get your API key and Secret key from Account Settings
   - Verify your sender email address

2. **Configure Environment**
   ```env
   EMAIL_PROVIDER=mailjet
   MAILJET_API_KEY=your-api-key
   MAILJET_SECRET_KEY=your-secret-key
   MAILJET_FROM_EMAIL=noreply@yourdomain.com
   MAILJET_FROM_NAME=Finance Watch
   ```

3. **Enable for Users**
   - Users can opt-in/out via Settings → Email Notifications
   - Toggle "Weekly Expense Summary" on/off

4. **Manual Trigger**
   - Users can send themselves a summary instantly
   - Click "Email Weekly Summary" button on Daily Expenses page

#### Scheduled Job
The weekly summary is triggered by AWS CloudWatch Events:
- **Schedule**: Every Monday at 3:30 AM UTC (9:00 AM IST)
- **Handler**: `src/handlers/scheduledJobs.sendWeeklyExpenseSummaries`

## License

MIT
