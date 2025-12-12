import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Skeleton } from '@mui/material';
import { useEffect, lazy, Suspense } from 'react';

// Pages - Lazy loaded
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Applications = lazy(() => import('./pages/Applications'));
const Archived = lazy(() => import('./pages/Archived'));
const Calendar = lazy(() => import('./pages/Calendar'));
const CVManager = lazy(() => import('./pages/CVManager'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const GmailIntegration = lazy(() => import('./pages/GmailIntegration'));
const JobSearch = lazy(() => import('./pages/JobSearch'));
const Networking = lazy(() => import('./pages/Networking'));
const Settings = lazy(() => import('./pages/Settings'));

// Components - Loaded immediately (small size)
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { OnboardingTour, useOnboarding } from './components/OnboardingTour';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ThemeContextProvider } from './contexts/ThemeContext';

// Analytics
import { initGA, trackPageView } from './services/googleAnalytics';

// Loading component with skeleton
const LoadingFallback = () => (
  <Box
    sx={{
      p: 3,
      minHeight: '100vh',
    }}
  >
    <Skeleton variant="text" width="40%" height={40} sx={{ mb: 3 }} />
    <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1, mb: 2 }} />
    <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
  </Box>
);

// Component to track page views
function AppContent() {
  const location = useLocation();
  const { showOnboarding, setShowOnboarding } = useOnboarding();

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search);
  }, [location]);
  
  // Prefetch commonly accessed routes for better performance
  useEffect(() => {
    // Prefetch likely next routes after initial load
    const timer = setTimeout(() => {
      // Prefetch common routes (excluding current route)
      const commonRoutes = ['/dashboard', '/applications', '/analytics', '/cv-manager', '/networking'];
      commonRoutes.forEach((route) => {
        if (route !== location.pathname) {
          // Dynamically import to prefetch
          switch (route) {
            case '/dashboard':
              import('./pages/Dashboard');
              break;
            case '/applications':
              import('./pages/Applications');
              break;
            case '/analytics':
              import('./pages/Analytics');
              break;
            case '/cv-manager':
              import('./pages/CVManager');
              break;
            case '/networking':
              import('./pages/Networking');
              break;
          }
        }
      });
    }, 2000); // Prefetch after 2 seconds to not interfere with initial load

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <OnboardingTour
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
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
          path="/archived"
          element={
            <ProtectedRoute>
              <Layout>
                <Archived />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Layout>
                <Calendar />
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
          path="/gmail"
          element={
            <ProtectedRoute>
              <Layout>
                <GmailIntegration />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/job-search"
          element={
            <ProtectedRoute>
              <Layout>
                <JobSearch />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/networking"
          element={
            <ProtectedRoute>
              <Layout>
                <Networking />
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
    </Suspense>
  );
}

function App() {
  // Initialize Google Analytics on app mount
  useEffect(() => {
    try {
      initGA();
      console.log('✅ Google Analytics initialized');
    } catch (error) {
      console.error('❌ Error initializing Google Analytics:', error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeContextProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeContextProvider>
    </ErrorBoundary>
  );
}

export default App;

