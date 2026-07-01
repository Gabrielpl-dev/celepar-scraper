import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../global.css'
import ExtracaoApp from './ExtracaoApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ExtracaoApp />
  </StrictMode>
)
