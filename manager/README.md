# Money Tracker - Backend API

Serverless backend API for the Money Tracker application, built with AWS Lambda and MongoDB.

## Tech Stack

- **AWS Lambda** for serverless compute
- **API Gateway** (HTTP API) for REST endpoints
- **MongoDB Atlas** for database
- **Firebase Admin** for authentication token verification
- **Serverless Framework** for deployment
- **TypeScript** for type safety
- **Mongoose** for MongoDB ODM
- **Grafana Cloud** for observability (traces & logs via OTLP)

## Prerequisites

- Node.js 18+
- npm or yarn
- AWS CLI configured with credentials
- MongoDB Atlas account
- Firebase project

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/money-tracker?retryWrites=true&w=majority
FIREBASE_PROJECT_ID=your-firebase-project-id
```

### 3. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster (M0 Sandbox)
3. Create a database user with read/write access
4. Whitelist your IP (or 0.0.0.0/0 for Lambda)
5. Get the connection string and add to `.env`

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Copy the Project ID to `.env`

## Development

Run the API locally using Serverless Offline:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Deployment

Deploy to AWS:

```bash
# Deploy to dev stage
npm run deploy

# Deploy to production
npm run deploy:prod
```

## Project Structure

```
src/
├── handlers/            # Lambda function handlers
│   ├── income.ts        # Income CRUD operations
│   ├── expenses.ts      # Expense CRUD operations
│   ├── investments.ts   # Investment CRUD + status toggle
│   ├── assets.ts        # Asset CRUD + value updates
│   ├── dailyExpenses.ts # Daily expense tracking
│   ├── dashboard.ts     # Dashboard aggregation + snapshots
│   ├── settings.ts      # User settings management
│   ├── telegram.ts      # Telegram bot webhook
│   └── scheduledJobs.ts # Cron jobs (weekly summaries)
├── models/              # Mongoose schemas
│   ├── User.ts          # User model with settings
│   ├── Income.ts        # Income source model
│   ├── Expense.ts       # Expense model
│   ├── DailyExpense.ts  # Daily expense model
│   ├── Investment.ts    # Investment model (SIP/voluntary)
│   ├── Asset.ts         # Asset model with value history
│   └── Snapshot.ts      # Monthly snapshot model
├── middleware/          # Express-style middleware
│   └── auth.ts          # Firebase token verification + telemetry
├── services/            # External service integrations
│   ├── telegram.ts      # Telegram Bot API utilities
│   ├── analytics.ts     # Weekly analytics generation
│   ├── email/           # Email providers (Mailjet)
│   └── llm/             # LLM providers (Azure OpenAI)
├── utils/               # Utility modules
│   ├── db.ts            # MongoDB connection with caching
│   ├── response.ts      # API response helpers
│   └── telemetry.ts     # Custom OTLP telemetry & logger
└── types/               # TypeScript definitions
    └── index.ts
```

## API Endpoints

### Authentication

All endpoints require a valid Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Income

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/income` | Get all income sources |
| POST | `/api/income` | Create income source |
| PUT | `/api/income/{id}` | Update income source |
| DELETE | `/api/income/{id}` | Delete income source |

**Request Body (POST/PUT):**
```json
{
  "name": "UiPath Salary",
  "amount": 330000,
  "type": "salary",
  "currency": "INR"
}
```

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | Get all expenses |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/{id}` | Update expense |
| DELETE | `/api/expenses/{id}` | Delete expense |

**Request Body (POST/PUT):**
```json
{
  "name": "House Rent",
  "amount": 34000,
  "category": "housing",
  "isRecurring": true,
  "currency": "INR"
}
```

### Investments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investments` | Get all investments |
| GET | `/api/investments?type=sip` | Get SIPs only |
| GET | `/api/investments?type=voluntary` | Get voluntary only |
| POST | `/api/investments` | Create investment |
| PUT | `/api/investments/{id}` | Update investment |
| PATCH | `/api/investments/{id}/status` | Toggle status (active/paused) |
| DELETE | `/api/investments/{id}` | Delete investment |

**Request Body (POST/PUT):**
```json
{
  "name": "Jupiter MF",
  "type": "sip",
  "amount": 25000,
  "category": "mutual_fund",
  "platform": "Jupiter",
  "currency": "INR"
}
```

**Request Body (PATCH status):**
```json
{
  "status": "paused"
}
```

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | Get all assets |
| GET | `/api/assets?includeSold=true` | Include sold assets |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/{id}` | Update asset details |
| PATCH | `/api/assets/{id}/value` | Update current value |
| DELETE | `/api/assets/{id}` | Mark as sold |
| DELETE | `/api/assets/{id}?hard=true` | Permanently delete |

**Request Body (POST/PUT):**
```json
{
  "name": "UiPath Stocks",
  "category": "stocks",
  "quantity": 150,
  "currentValueINR": 7674028.56,
  "currentValueUSD": 86225.04,
  "platform": "ESOP",
  "currency": "USD"
}
```

**Request Body (PATCH value):**
```json
{
  "currentValueINR": 8000000,
  "currentValueUSD": 90000
}
```

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get complete dashboard data |
| GET | `/api/snapshots` | Get monthly snapshots |
| GET | `/api/snapshots?limit=6` | Get last 6 snapshots |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update settings |

**Request Body (PUT):**
```json
{
  "exchangeRates": {
    "USD": 89
  }
}
```

## Data Models

### Income Types
- `salary` - Regular employment income
- `freelance` - Freelance/contract work
- `dividend` - Stock dividends
- `rental` - Rental income
- `other` - Other income sources

### Expense Categories
- `housing` - Rent, mortgage, maintenance
- `transport` - Car EMI, fuel, commute
- `utilities` - Electricity, water, internet
- `subscriptions` - OTT, software subscriptions
- `loan` - Personal loans, credit cards
- `other` - Miscellaneous expenses

### Investment Types
- `sip` - Systematic Investment Plan (recurring)
- `voluntary` - One-time/voluntary investments

### Investment Categories
- `mutual_fund` - Mutual funds
- `stocks` - Direct equity
- `crypto` - Cryptocurrency
- `other` - Other investments

### Asset Categories
- `stocks` - Direct equity holdings
- `mutual_fund` - Mutual fund units
- `crypto` - Cryptocurrency holdings
- `fd` - Fixed deposits
- `real_estate` - Property
- `other` - Other assets

### Investment Status
- `active` - Currently active
- `paused` - Temporarily paused
- `stopped` - Permanently stopped

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server |
| `npm run deploy` | Deploy to AWS (dev stage) |
| `npm run deploy:prod` | Deploy to AWS (prod stage) |
| `npm run logs` | View CloudWatch logs |

## Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `FIREBASE_PROJECT_ID` | Firebase project ID for auth verification |
| `GRAFANA_OTLP_ENDPOINT` | Grafana Cloud OTLP endpoint (optional) |
| `GRAFANA_OTLP_HEADERS` | OTLP auth headers, format: `Authorization=Basic <base64>` (optional) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for expense tracking (optional) |
| `LLM_PROVIDER` | LLM provider for parsing expenses: `azure-openai` or `none` (optional) |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key (optional) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint (optional) |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI deployment name (optional) |
| `EMAIL_PROVIDER` | Email provider: `mailjet` or `console` (optional) |
| `MAILJET_API_KEY` | Mailjet API key (optional) |
| `MAILJET_SECRET_KEY` | Mailjet secret key (optional) |
| `MAILJET_FROM_EMAIL` | Sender email for Mailjet (optional) |

## CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000`
- `https://money.manasranjan.dev` (production)

The CORS config includes `traceparent` and `tracestate` headers for distributed tracing.

## Observability

The API includes built-in observability via a lightweight custom OTLP implementation that sends traces and logs to Grafana Cloud.

### Features

- **Distributed Tracing**: All requests are wrapped in spans with user context
- **Structured Logging**: Logger sends logs to both CloudWatch and Grafana
- **Cold Start Detection**: Tracks Lambda cold starts
- **Error Tracking**: Errors are recorded with stack traces

### Usage

```typescript
import { logger } from '../utils/telemetry';

// Logging
logger.info('User logged in', { userId: 'abc123' });
logger.error('Payment failed', { orderId: '456', reason: 'insufficient_funds' });
logger.warn('Rate limit approaching', { current: 95, limit: 100 });
logger.debug('Processing request', { path: '/api/expenses' });
```

### Configuration

Set these environment variables to enable Grafana Cloud integration:

```env
GRAFANA_OTLP_ENDPOINT=https://otlp-gateway-prod-ap-south-1.grafana.net/otlp
GRAFANA_OTLP_HEADERS=Authorization=Basic <base64-encoded-instanceid:api-token>
```

If not configured, logs will only go to CloudWatch and traces will be disabled.
