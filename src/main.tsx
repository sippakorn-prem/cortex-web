import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './components/image-slot';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
