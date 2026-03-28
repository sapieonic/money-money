# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Finance Watch — a personal finance app with React 19 frontend (`client/`) and AWS Lambda backend (`manager/`). Tracks income, expenses, investments, assets, and debts. No root package.json; each directory is independent.

## Commands

### Backend (`manager/`)
```bash
npm install              # install deps
npm run dev              # local dev via serverless-offline (http://localhost:3000)
npm run deploy:prod      # deploy to AWS Lambda (ap-south-1)
serverless logs -f <functionName>  # view Lambda logs
```

### Frontend (`client/`)
```bash
npm install              # install deps
npm run dev              # local dev via Vite (http://localhost:5173)
npm run build            # typecheck + production build
npm run lint             # ESLint
```

No test suite exists — `npm test` in manager is a no-op stub.

## Architecture

### Monorepo layout
- **`client/`** — React 19, TypeScript, MUI v7, Vite, React Query v5, Firebase Auth (Google Sign-in)
- **`manager/`** — AWS Lambda (Serverless Framework v4), TypeScript, MongoDB/Mongoose, Firebase Admin SDK

### Backend patterns
- **Auth middleware**: All handlers wrap with `withAuth()` (`middleware/auth.ts`) which validates Firebase ID tokens and attaches `userId`/`userInfo` to the event. The Telegram webhook is the one exception (no auth).
- **DB connection**: Lazy singleton via `connectToDatabase()` (`utils/db.ts`). Must be called at the top of every handler before using models.
- **Response helpers**: `success()`, `error()`, `notFound()`, `badRequest()`, `unauthorized()` in `utils/response.ts`. All handlers return `APIGatewayProxyResultV2` through these.
- **Multi-tenancy**: Every DB query must filter by `userId`. All models use `isActive: true` for soft deletes.
- **Factory pattern for providers**:
  - LLM: `services/llm/factory.ts` — `ILLMProvider` interface with `parseExpenseMessage()` and `chatCompletion()`. Providers: Azure OpenAI, Databricks Claude, Fallback (regex). All AI features go through this factory.
  - Email: `services/email/factory.ts` — `EmailProvider` interface, implementations in `providers/`. Auto-detects Mailjet from env vars, falls back to console.
- **LLM modules** (all in `services/llm/`):
  - `intentClassifier.ts` — classifies Telegram messages as expense or query
  - `financialQuery.ts` — gathers scoped user data and generates natural-language answers
  - `dailyNarrative.ts` — daily expense digest for Telegram
  - `expenseReminder.ts` — expense due reminder for Telegram
  - `weeklyInsight.ts` — personalized insight paragraph for weekly email
  - `monthlyInsight.ts` — month-over-month comparison for monthly tracker
- **Telemetry**: Custom lightweight OTLP exporter (`utils/telemetry.ts`), not the full OpenTelemetry SDK. Frontend uses Grafana Faro (`client/src/telemetry/`).

### Scheduled jobs (CloudWatch → Lambda, 120s timeout)
Defined in `serverless.yml`. All scheduled handlers are in `handlers/scheduledJobs.ts`:
- Weekly email summary: Mondays 3:30 UTC (9 AM IST)
- Daily Telegram digest: 16:00 UTC (9:30 PM IST)
- Expense reminders: 13:15 UTC (6:45 PM IST)
- Debt payment processing: every 4 days

### Frontend patterns
- Pages in `pages/`, feature components in `components/<feature>/`
- API calls in `services/` using axios with Firebase auth token
- Auth context wraps the app (`context/AuthContext`)
- React Query for server state; queries are co-located in service files

### Key cross-cutting flows
- **Telegram → Expense**: webhook → intent classifier → `parseExpenseMessage()` → save DailyExpense
- **Telegram → Query**: webhook → intent classifier → `financialQuery.ts` gathers data by query type → `chatCompletion()` → reply
- **Debt creation**: creates Debt document + auto-creates linked recurring Expense (category: loan)
- **Monthly Ledger**: clones active income/expense/investment templates on first access per month, then tracks month-specific edits. Returns AI insight comparing with previous month.
- **Weekly Email**: scheduled job → `weeklyInsight.ts` generates AI insight → embedded in HTML/text email alongside charts

## Environment Variables

Backend requires `MONGODB_URI`, `MONGODB_DB_NAME`, `FIREBASE_PROJECT_ID` at minimum. Optional integrations (Telegram, Azure OpenAI, Databricks Claude, Mailjet, Grafana OTLP) are enabled by their respective env vars. All env vars must also be configured in `serverless.yml` for deployment.

Frontend uses `VITE_` prefix. Requires `VITE_API_URL` and Firebase config vars.

## Serverless Config

- Runtime: Node.js 22.x
- Region: ap-south-1
- Memory: 256MB, Timeout: 20s (scheduled jobs: 120s)
- Build: esbuild (bundle: true, minify: false)
- CORS configured for localhost:5173, localhost:3000, and money.manasranjan.dev
