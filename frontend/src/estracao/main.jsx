import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ExtracaoApp from './ExtracaoApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ExtracaoApp />
  </StrictMode>
)
