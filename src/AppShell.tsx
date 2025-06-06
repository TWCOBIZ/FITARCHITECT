import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import SplashScreen from './pages/SplashScreen'
import LandingPage from './pages/LandingPage'
import SubscriptionPage from './pages/SubscriptionPage'
import { SubscriptionManagementPage } from './pages/SubscriptionManagementPage'
import Dashboard from './pages/Dashboard'
import Nutrition from './pages/Nutrition'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import AdminLogin from './pages/AdminLogin'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import MealPlanning from './pages/MealPlanning'
import { SubscriptionPlans } from './components/subscription/SubscriptionPlans'
import ForgotPassword from './pages/ForgotPassword'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import WorkoutPage from './pages/WorkoutPage'
import { useUser } from './contexts/UserContext'
import { LoadingLogo } from './components/common/LoadingLogo'
import ProfileOnboardingStepper from './components/profile/ProfileOnboardingStepper'

const HeartbeatOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  const [showDismiss, setShowDismiss] = React.useState(false);
  React.useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setShowDismiss(true), 10000); // 10s safeguard
      return () => clearTimeout(timer);
    } else {
      setShowDismiss(false);
    }
  }, [show]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="flex flex-col items-center">
        <LoadingLogo size="lg" />
        <div className="text-white text-2xl font-bold mt-6 animate-pulse">Refreshing profile...</div>
        {showDismiss && (
          <button
            className="mt-6 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 border border-gray-600"
            onClick={() => window.location.reload()}
          >
            Dismiss (force reload)
          </button>
        )}
      </div>
    </div>
  );
};

const AppShell: React.FC = () => {
  console.log('AppShell: top-level render');
  const { isAppRefreshing, isProfileLoading } = useUser();

  return (
    <div>
      <HeartbeatOverlay show={isAppRefreshing || isProfileLoading} />
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
          <Route element={<Layout /* key={profileVersion} */ />}>
            <Route path="pricing" element={<SubscriptionPlans />} />
            {/* Protected Routes */}
            <Route 
              path="parq" 
              element={
                <ProtectedRoute requireAuth>
                  <ProfileOnboardingStepper />
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
                <ProtectedRoute requireAuth allowGuest={true}>
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
                <ProtectedRoute requireAuth={false} allowGuest={true}>
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
    </div>
  );
};

export default AppShell; 