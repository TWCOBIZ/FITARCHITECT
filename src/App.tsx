import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import { UserProvider } from './contexts/UserContext'
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
import WorkoutPlans from './components/workout/WorkoutPlans'
import Nutrition from './pages/Nutrition'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import FitnessProfile from './pages/FitnessProfile'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import AdminLogin from './pages/AdminLogin'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import MealPlanning from './pages/MealPlanning'
import { SubscriptionPlans } from './components/subscription/SubscriptionPlans'
import ForgotPassword from './pages/ForgotPassword'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import WorkoutPage from './pages/WorkoutPage'

// Create a client
const queryClient = new QueryClient()

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <UserProvider>
            <StripeProvider>
              <WorkoutProvider>
                <OpenAIProvider>
                  <NutritionProvider>
                    <WgerProvider>
                      <AdminAuthProvider>
                        <Router>
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
                                  <ProtectedRoute requireAuth requireParq>
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
                                  <ProtectedRoute requireAuth requireParq allowGuest={true}>
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
                                  <ProtectedRoute requireAuth requireParq allowGuest={true}>
                                    <MealPlanning />
                                  </ProtectedRoute>
                                }
                              />
                            </Route>
                          </Routes>
                        </Router>
                      </AdminAuthProvider>
                    </WgerProvider>
                  </NutritionProvider>
                </OpenAIProvider>
              </WorkoutProvider>
            </StripeProvider>
          </UserProvider>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>
  )
}

export default App 