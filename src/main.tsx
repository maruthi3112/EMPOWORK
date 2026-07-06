import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ToastProvider>
  </StrictMode>,
);
