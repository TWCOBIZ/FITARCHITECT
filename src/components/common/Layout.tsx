import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { useAuth } from '../../contexts/AuthContext'

const Layout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const showFooter = isAuthenticated && user && user.id && user.email;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  )
}

export default Layout 