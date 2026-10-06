import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BillingProvider } from './context/BillingContext';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <BillingProvider>
        <App />
      </BillingProvider>
    </AuthProvider>
  </BrowserRouter>
);
