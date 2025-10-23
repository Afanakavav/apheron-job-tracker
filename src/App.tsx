import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import CVManager from './pages/CVManager';
import Analytics from './pages/Analytics';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <Layout>
                  <Applications />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cv-manager"
            element={
              <ProtectedRoute>
                <Layout>
                  <CVManager />
                </Layout>
              </ProtectedRoute>
            }
          />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AIAssistant />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

