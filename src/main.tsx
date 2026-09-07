import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { firebaseService } from './services/firebase';

// Inicialização e verificação de conectividade com o Cloud Firestore
firebaseService.testConnection().then(() => {
  firebaseService.initDefaults().catch((err) => {
    console.warn('Erro ao inicializar dados padrão no Firestore:', err);
  });
}).catch((err) => {
  console.warn('Verificação de conexão Firestore:', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
