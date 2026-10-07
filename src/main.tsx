import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './app/App';
import { MessageProvider } from './app/messages';
import { ReportsProvider } from './app/ReportsContext';
import { AppStateProvider } from './state/store';

const container = document.getElementById('root');
if (!container) throw new Error('На странице нет элемента #root');

createRoot(container).render(
  <StrictMode>
    <AppStateProvider>
      <MessageProvider>
        <ReportsProvider>
          <App />
        </ReportsProvider>
      </MessageProvider>
    </AppStateProvider>
  </StrictMode>
);
