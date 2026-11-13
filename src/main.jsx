import './services/securityShield.js'
import './services/clientSearchService.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DownloadToastContainer from './components/DownloadToastContainer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <DownloadToastContainer />
  </StrictMode>,
)
