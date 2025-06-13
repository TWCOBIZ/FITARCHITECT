import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import { StripeProvider } from './contexts/StripeContext'
import { NutritionProvider } from './contexts/NutritionContext'
import { OpenAIProvider } from './contexts/OpenAIContext'
import { WgerProvider } from './contexts/WgerContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { ParqForm } from './components/parq/ParqForm'
import SplashScreen from './pages/SplashScreen'
import LandingPage from './pages/LandingPage'
import SubscriptionPage from './pages/SubscriptionPage'
import { WorkoutProvider } from './contexts/WorkoutContext'
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
import AdminDashboard from './pages/AdminDashboard'
import MealPlanning from './pages/MealPlanning'
import { SubscriptionPlans } from './components/subscription/SubscriptionPlans'
import ForgotPassword from './pages/ForgotPassword'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import WorkoutPage from './pages/WorkoutPage'
import Analytics from './pages/Analytics'
import FoodScan from './pages/FoodScan'
import NotificationSettings from './pages/NotificationSettings'

// Create a client
const queryClient = new QueryClient()

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <StripeProvider>
            <WorkoutProvider>
              <OpenAIProvider>
                <NutritionProvider>
                  <WgerProvider>
                    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
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
                                  <ProtectedRoute requireAuth requireParq>
                                    <FitnessProfile />
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
                                path="dashboard" 
                                element={
                                  <ProtectedRoute requireAuth allowGuest>
                                    <Dashboard />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="workouts" 
                                element={
                                  <ProtectedRoute requireAuth requireParq requireSubscription="basic">
                                    <WorkoutPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="nutrition" 
                                element={
                                  <ProtectedRoute requireAuth allowGuest={true}>
                                    <Nutrition />
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
                                path="meal-planning"
                                element={
                                  <ProtectedRoute requireAuth allowGuest={true}>
                                    <MealPlanning />
                                  </ProtectedRoute>
                                }
                              />
                              <Route 
                                path="analytics"
                                element={
                                  <ProtectedRoute requireAuth allowGuest={true}>
                                    <Analytics />
                                  </ProtectedRoute>
                                }
                              />
                              <Route 
                                path="food-scan"
                                element={
                                  <ProtectedRoute requireAuth requireSubscription="premium">
                                    <FoodScan />
                                  </ProtectedRoute>
                                }
                              />
                              <Route 
                                path="settings/notifications"
                                element={
                                  <ProtectedRoute requireAuth requireSubscription="premium">
                                    <NotificationSettings />
                                  </ProtectedRoute>
                                }
                              />
                            </Route>
                          </Routes>
                    </Router>
                    {/* Toast Notification System - FitArchitect Black/White Theme */}
                    <Toaster
                      position="top-center"
                      reverseOrder={false}
                      gutter={8}
                      containerClassName=""
                      containerStyle={{}}
                      toastOptions={{
                        // Default options for all toasts
                        duration: 4000,
                        style: {
                          background: '#1f2937', // Dark gray background
                          color: '#ffffff',      // White text
                          border: '1px solid #374151', // Gray border
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          padding: '16px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          maxWidth: '500px',
                        },
                        // Success toast styling
                        success: {
                          duration: 3000,
                          style: {
                            border: '1px solid #10b981', // Green border for success
                            backgroundColor: '#1f2937',
                          },
                          iconTheme: {
                            primary: '#10b981', // Green check icon
                            secondary: '#ffffff',
                          },
                        },
                        // Error toast styling  
                        error: {
                          duration: 5000,
                          style: {
                            border: '1px solid #ef4444', // Red border for errors
                            backgroundColor: '#1f2937',
                          },
                          iconTheme: {
                            primary: '#ef4444', // Red X icon
                            secondary: '#ffffff',
                          },
                        },
                        // Loading toast styling
                        loading: {
                          style: {
                            border: '1px solid #3b82f6', // Blue border for loading
                            backgroundColor: '#1f2937',
                          },
                          iconTheme: {
                            primary: '#3b82f6', // Blue loading spinner
                            secondary: '#ffffff',
                          },
                        },
                      }}
                    />
                  </WgerProvider>
                </NutritionProvider>
              </OpenAIProvider>
            </WorkoutProvider>
          </StripeProvider>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>
  )
}

export default App 