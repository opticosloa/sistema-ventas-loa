import { createRoot } from 'react-dom/client';
import './index.css';
import { Analytics } from "@vercel/analytics/react"
import { Provider } from 'react-redux';
import { store } from './store/store';
import { BrowserRouter } from 'react-router-dom';
import SisVentasApp from './SisVentasApp';
import { AppLoader } from './helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <>
    <Analytics />
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AppLoader>
          <BrowserRouter>
            <SisVentasApp />
          </BrowserRouter>
        </AppLoader>
      </Provider>
    </QueryClientProvider>
  </>


)
