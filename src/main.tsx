import React from 'react';
import { createRoot } from 'react-dom/client';
import RentVsBuySimulator from './RentVsBuySimulator';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RentVsBuySimulator />
  </React.StrictMode>
);
