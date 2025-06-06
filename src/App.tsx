import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import { UserProvider } from './contexts/UserContext'
import { StripeProvider } from './contexts/StripeContext'
import { NutritionProvider } from './contexts/NutritionContext'
import { OpenAIProvider } from './contexts/OpenAIContext'
import { WgerProvider } from './contexts/WgerContext'
import { WorkoutProvider } from './contexts/WorkoutContext'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import AppShell from './AppShell'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { ProfileProvider } from './contexts/ProfileContext'

const queryClient = new QueryClient()

const UserAndAuthProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('UserAndAuthProviders: Starting');
  // Local state to trigger profile reloads
  const [profileVersion, setProfileVersion] = React.useState(Date.now());

  // This function will be passed to AuthProvider and UserProvider
  const reloadUserProfile = React.useCallback(() => {
    setProfileVersion(Date.now());
  }, []);

  console.log('UserAndAuthProviders: Before AuthProvider');
  return (
    <AuthProvider reloadUserProfile={reloadUserProfile}>
      {console.log('UserAndAuthProviders: Inside AuthProvider')}
      <UserProvider profileVersion={profileVersion} reloadUserProfile={reloadUserProfile}>
        {console.log('UserAndAuthProviders: Inside UserProvider')}
        {children}
      </UserProvider>
    </AuthProvider>
  );
};

const App: React.FC = () => {
  console.log('App: Starting');
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { background: '#111', color: '#fff', fontWeight: 600, fontSize: '1rem', borderRadius: '0.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' } }} />
      {console.log('App: Inside QueryClientProvider')}
      <AppProvider>
        {console.log('App: Inside AppProvider')}
        <ProfileProvider>
          <UserAndAuthProviders>
            <WorkoutProvider>
              <StripeProvider>
                <OpenAIProvider>
                  <NutritionProvider>
                    <WgerProvider>
                      <AdminAuthProvider>
                        <ErrorBoundary>
                          <AppShell />
                        </ErrorBoundary>
                      </AdminAuthProvider>
                    </WgerProvider>
                  </NutritionProvider>
                </OpenAIProvider>
              </StripeProvider>
            </WorkoutProvider>
          </UserAndAuthProviders>
        </ProfileProvider>
      </AppProvider>
    </QueryClientProvider>
  )
}

export default App 