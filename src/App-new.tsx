import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/common/ErrorBoundary'
import LoadingSpinner from './components/common/LoadingSpinner'
import { StripeProvider } from './contexts/StripeContext'
import { useStoreInitialization } from './stores'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { ParqForm } from './components/parq/ParqForm'
import SplashScreen from './pages/SplashScreen'
import LandingPage from './pages/LandingPage'
import SubscriptionPage from './pages/SubscriptionPage'
import Layout from './components/common/Layout'
import { SubscriptionManagementPage } from './pages/SubscriptionManagementPage'
import Dashboard from './pages/Dashboard'
import Nutrition from './pages/Nutrition'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import FitnessProfile from './pages/FitnessProfile'
import AdminLogin from './pages/AdminLogin'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import { BackendReadinessWrapper } from './components/common/BackendReadinessWrapper'
import ForgotPassword from './pages/ForgotPassword'
import ResetPasswordForm from './components/auth/ResetPasswordForm'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import Analytics from './pages/Analytics'
import NotificationSettings from './pages/NotificationSettings'
import { LoadingOverlay } from './components/common/LoadingOverlay'
import { NotificationContainer } from './components/common/NotificationContainer'
import { TestZustandMigration } from './pages/TestZustandMigration'

// Lazy load heavy components for better performance
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const MealPlanning = React.lazy(() => import('./pages/MealPlanning'))
const NutritionTracking = React.lazy(() => import('./pages/NutritionTracking'))
const Recipes = React.lazy(() => import('./pages/Recipes'))
const WorkoutPage = React.lazy(() => import('./pages/WorkoutPage'))
const FoodScan = React.lazy(() => import('./pages/FoodScan'))
const SubscriptionPlans = React.lazy(() => import('./components/subscription/SubscriptionPlans').then(module => ({ default: module.SubscriptionPlans })))

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

// Store initialization component
const StoreInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initializeStores } = useStoreInitialization();
  
  useEffect(() => {
    initializeStores();
  }, [initializeStores]);
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BackendReadinessWrapper>
        <QueryClientProvider client={queryClient}>
          <StoreInitializer>
            <StripeProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center bg-gray-900">
                    <LoadingSpinner size="xl" color="white" text="Loading..." />
                  </div>
                }>
                  <Routes>
                    {/* Admin Routes (outside main Layout) */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/dashboard/*" element={
                      <AdminProtectedRoute>
                        <AdminDashboard />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Public routes WITHOUT header/footer */}
                    <Route path="/" element={<SplashScreen />} />
                    <Route path="/landing" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPasswordForm />} />
                    <Route path="/subscription/success" element={<SubscriptionSuccess />} />
                    <Route path="/test-zustand-migration" element={<TestZustandMigration />} />
                    
                    {/* Main App Routes WITH header/footer */}
                    <Route element={<Layout />}>
                      <Route path="pricing" element={<SubscriptionPlans />} />
                      
                      {/* Protected Routes */}
                      <Route 
                        path="parq" 
                        element={
                          <ProtectedRoute requireAuth>
                            <ParqForm />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="fitness-profile" 
                        element={
                          <ProtectedRoute requireAuth>
                            <FitnessProfile />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="dashboard" 
                        element={
                          <ProtectedRoute requireAuth>
                            <Dashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="workout/*" 
                        element={
                          <ProtectedRoute requireAuth>
                            <WorkoutPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="nutrition" 
                        element={
                          <ProtectedRoute requireAuth>
                            <Nutrition />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="meal-planning" 
                        element={
                          <ProtectedRoute requireAuth>
                            <MealPlanning />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="nutrition/tracking" 
                        element={
                          <ProtectedRoute requireAuth>
                            <NutritionTracking />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="nutrition/scan" 
                        element={
                          <ProtectedRoute requireAuth>
                            <FoodScan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="recipes" 
                        element={
                          <ProtectedRoute requireAuth>
                            <Recipes />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="profile" 
                        element={
                          <ProtectedRoute requireAuth>
                            <Profile />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="subscription" 
                        element={
                          <ProtectedRoute requireAuth>
                            <SubscriptionPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="subscription/manage" 
                        element={
                          <ProtectedRoute requireAuth>
                            <SubscriptionManagementPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="analytics" 
                        element={
                          <ProtectedRoute requireAuth>
                            <Analytics />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="notifications" 
                        element={
                          <ProtectedRoute requireAuth>
                            <NotificationSettings />
                          </ProtectedRoute>
                        } 
                      />
                    </Route>
                  </Routes>
                </Suspense>
              </Router>
            </StripeProvider>
          </StoreInitializer>
        </QueryClientProvider>
      </BackendReadinessWrapper>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1F2937',
            color: '#F3F4F6',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#F3F4F6',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#F3F4F6',
            },
          },
        }}
      />
      <LoadingOverlay />
      <NotificationContainer />
    </ErrorBoundary>
  )
}

export default App