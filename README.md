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
- **Scheduled Jobs** - CloudWatch Events for automated tasks (weekly email summaries)

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
│   │   │   └── assets/        # Asset-related components
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
│   │   │   │   └── providers/ # Provider implementations
│   │   │   ├── email/         # Email provider implementations
│   │   │   │   ├── types.ts   # Email interfaces
│   │   │   │   ├── factory.ts # Provider factory
│   │   │   │   ├── providers/ # Provider implementations (Mailjet, etc.)
│   │   │   │   └── templates/ # Email templates
│   │   │   └── analytics/     # Analytics services
│   │   │       └── weeklyExpenseAnalytics.ts
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
LLM_PROVIDER=azure-openai  # or leave empty for regex fallback

# Azure OpenAI (Required if LLM_PROVIDER=azure-openai)
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

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
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/{id}` | Update expense |
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

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | Get all assets |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/{id}` | Update asset |
| PATCH | `/api/assets/{id}/value` | Update asset value |
| DELETE | `/api/assets/{id}` | Delete asset |

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
| OpenAI | Planned | - |
| Anthropic | Planned | - |
| Fallback (Regex) | Default | No config needed |

#### Provider Selection
The system auto-detects the provider based on available credentials:
1. If `LLM_PROVIDER` is set explicitly, uses that provider
2. If `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` are set, uses Azure OpenAI
3. Falls back to regex-based parsing if no LLM is configured

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

#### Supported SMS Formats
The AI parser can intelligently extract information from various formats:
- `Rs.500 debited at Amazon` → Shopping, Amazon
- `INR 1,200.00 paid to Swiggy` → Food, Swiggy
- `Your a/c debited by Rs.250 at UBER` → Travel, Uber
- `Paid Rupees 100 to Apollo Pharmacy` → Health, Apollo Pharmacy

The LLM understands context and can categorize expenses accurately even with varied message formats.

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
