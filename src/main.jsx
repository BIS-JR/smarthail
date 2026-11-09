import React from 'react';
import ReactDOM from 'react-dom/client';
import moment from 'moment';
import 'moment/dist/locale/pt-br';
import App from './App';
import { registerServiceWorker } from './api/push';
import './index.css';

moment.locale('pt-br');

// Service worker: recebe notificações push e permite instalar o app (PWA)
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
