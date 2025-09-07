// Import polyfills FIRST - this is critical for Buffer availability
import './polyfills.js'

// Import MetaMask conflict resolver
import './utils/wallet.js'

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { AuthProvider } from "./utils/AuthContext";
import "./index.css";

console.log('🚀 Index.js is loading...')
console.log('Buffer available:', typeof Buffer)
console.log('Process available:', typeof process)

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
