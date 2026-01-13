# Money Tracker - Frontend

A React-based web application for tracking personal finances including income, expenses, investments (SIPs), and assets.

## Tech Stack

- **React 18** with TypeScript
- **Material UI (MUI)** for UI components
- **React Router** for navigation
- **React Query** for server state management
- **Firebase** for authentication (Google Sign-in)
- **Recharts** for data visualization
- **Axios** for API communication
- **Vite** for build tooling

## Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project with Google Auth enabled
- Backend API running (see `../manager`)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase configuration:

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Go to Project Settings > General
4. Scroll down to "Your apps" and click "Add app" > Web
5. Copy the config values to your `.env` file
6. Enable Google Sign-in under Authentication > Sign-in method

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Shared components (Navbar, Sidebar, etc.)
│   ├── income/          # Income-related components
│   ├── expenses/        # Expense-related components
│   ├── investments/     # Investment-related components
│   └── assets/          # Asset-related components
├── pages/               # Page components
│   ├── Dashboard.tsx    # Main dashboard with summary
│   ├── Income.tsx       # Income management
│   ├── Expenses.tsx     # Expense management
│   ├── Investments.tsx  # SIPs and voluntary investments
│   ├── Assets.tsx       # Asset portfolio management
│   ├── Settings.tsx     # User settings
│   └── Login.tsx        # Authentication page
├── services/            # API service modules
│   ├── api.ts           # Axios instance with interceptors
│   ├── firebase.ts      # Firebase configuration
│   ├── incomeService.ts
│   ├── expenseService.ts
│   ├── investmentService.ts
│   ├── assetService.ts
│   ├── dashboardService.ts
│   └── settingsService.ts
├── context/             # React contexts
│   └── AuthContext.tsx  # Authentication state management
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
│   └── index.ts
├── theme/               # MUI theme customization
│   └── theme.ts
├── utils/               # Utility functions
│   └── formatters.ts    # Currency and date formatters
├── App.tsx              # Main app component with routing
└── main.tsx             # Application entry point
```

## Features

### Dashboard
- Summary cards showing income, expenses, investments, and remaining balance
- Pie chart for monthly allocation visualization
- Quick stats including savings rate and investment rate

### Income Management
- Add, edit, and delete income sources
- Categorize by type (salary, freelance, dividend, rental, other)
- View total monthly income

### Expense Management
- Add, edit, and delete expenses
- Categorize by type (housing, transport, utilities, subscriptions, loan, other)
- Mark expenses as recurring or one-time

### Investment Management
- Manage SIPs (Systematic Investment Plans)
- Manage voluntary/one-time investments
- Pause/resume SIPs
- Categorize by type (mutual fund, stocks, crypto, other)

### Asset Portfolio
- Track all assets with current values
- Support for multiple currencies (INR/USD)
- Value history tracking with charts
- Mark assets as sold

### Settings
- Configure USD/INR exchange rate
- View profile information

## Responsive Design

The application is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
