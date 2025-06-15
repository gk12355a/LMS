import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AppContextProvider } from './context/AppContext.jsx';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { Scrollbar } from 'react-scrollbars-custom';

// Thêm thư viện disable-devtool
import DisableDevtool from 'disable-devtool';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

// Cấu hình disable-devtool
DisableDevtool({
  ondevtoolopen: () => {
    alert('DevTools bị chặn!');
    window.location.href = 'about:blank'; // Chuyển hướng khi DevTools mở
  },
  interval: 1000 // Kiểm tra mỗi giây
});

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AppContextProvider>
        <Scrollbar style={{ width: '100vw', height: '100vh' }}>
          <App />
        </Scrollbar>
      </AppContextProvider>
    </ClerkProvider>
  </BrowserRouter>
);