# Finance Watch

A full-stack personal finance management application to track income, expenses, investments, and assets with comprehensive tax tracking and multi-currency support.

![Finance Watch](client/public/favicon.svg)

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

### Dashboard
- Visual allocation breakdown with donut chart
- Income sources with tax breakdown per entry
- Quick stats (effective tax rate, savings rate, investment rate)
- Asset portfolio summary in multiple currencies

## Tech Stack

### Frontend (`client/`)
- **React 18** with TypeScript
- **Material UI (MUI)** for UI components
- **Recharts** for data visualization
- **Vite** for build tooling
- **Firebase** for authentication (Google Sign-in)

### Backend (`manager/`)
- **AWS Lambda** with Serverless Framework v4
- **TypeScript**
- **MongoDB** with Mongoose ODM
- **Firebase Admin SDK** for token verification

## Project Structure

```
money-money/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Shared components
│   │   │   ├── income/        # Income-related components
│   │   │   ├── expenses/      # Expense-related components
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

### Environment Setup

#### Backend (`manager/.env`)
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
MONGODB_DB_NAME=finance-watch
FIREBASE_PROJECT_ID=your-firebase-project-id
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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/income` | Get all income sources |
| POST | `/api/income` | Create income source |
| PUT | `/api/income/{id}` | Update income source |
| DELETE | `/api/income/{id}` | Delete income source |
| GET | `/api/expenses` | Get all expenses |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/{id}` | Update expense |
| DELETE | `/api/expenses/{id}` | Delete expense |
| GET | `/api/investments` | Get all investments |
| POST | `/api/investments` | Create investment |
| PUT | `/api/investments/{id}` | Update investment |
| PATCH | `/api/investments/{id}/status` | Toggle investment status |
| DELETE | `/api/investments/{id}` | Delete investment |
| GET | `/api/assets` | Get all assets |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/{id}` | Update asset |
| PATCH | `/api/assets/{id}/value` | Update asset value |
| DELETE | `/api/assets/{id}` | Delete asset |
| GET | `/api/dashboard` | Get dashboard summary |
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |

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

## License

MIT
