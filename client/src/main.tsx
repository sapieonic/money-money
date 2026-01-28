import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Initialize telemetry before rendering
import { initTelemetry } from './telemetry'
import { initWebVitals } from './telemetry/webVitals'

// Initialize OpenTelemetry
initTelemetry()

// Initialize Web Vitals monitoring
initWebVitals()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
