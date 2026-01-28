import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Initialize Grafana Faro telemetry before rendering
// Faro automatically captures web vitals, errors, and performance metrics
import { initTelemetry } from './telemetry'
initTelemetry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
