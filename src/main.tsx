import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './utils/testSuite';

createRoot(document.getElementById('root')!).render(
  <App />
);
