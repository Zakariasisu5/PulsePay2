// Import polyfills FIRST - this is critical for Buffer availability
import { Buffer } from "buffer";
import process from "process";

// attach to window BEFORE anything else runs
window.Buffer = Buffer;
window.process = process;

// Import MetaMask conflict resolver
import './utils/wallet.js'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('🚀 Main.jsx is loading...')
console.log('Buffer available:', typeof Buffer)
console.log('Process available:', typeof process)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
