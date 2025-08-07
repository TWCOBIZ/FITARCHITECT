import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '/assets/images/logo.png'

const Header: React.FC = () => {
  const { isAuthenticated, logout, isGuest, subscriptionTier } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsMobileMenuOpen(false)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="bg-surface-primary text-text-primary border-b border-surface-border relative z-50">
      <div className="container-app py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center text-lg sm:text-xl lg:text-2xl font-bold gap-2 hover:text-brand-primary transition-colors">
            <img src={logo} alt="Logo" className="h-6 w-6 md:h-8 md:w-8" />
            <span className="hidden sm:block">FITARCHITECT</span>
            <span className="sm:hidden">FA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-6">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="nav-link flex items-center gap-2">
                  Dashboard
                </Link>
                <Link to="/workouts" className="nav-link flex items-center gap-2">
                  Workouts
                  {subscriptionTier === 'free' && (
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Free Trial</span>
                  )}
                </Link>
                <Link to="/nutrition" className="nav-link flex items-center gap-2">
                  Nutrition
                </Link>
                <Link to="/meal-planning" className="nav-link flex items-center gap-2">
                  Meal Plans
                </Link>
                {!isGuest && (
                  <Link to="/profile" className="nav-link flex items-center gap-2">
                    Profile
                  </Link>
                )}
                {subscriptionTier === 'premium' && (
                  <Link to="/food-scan" className="nav-link flex items-center gap-2">
                    Food Scan
                  </Link>
                )}
                {isGuest ? (
                  <Link to="/register" className="btn-primary flex items-center gap-2">
                    Sign Up
                  </Link>
                ) : (
                  <button onClick={handleLogout} className="btn-secondary">
                    Logout
                  </button>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex flex-col justify-center items-center w-8 h-8 sm:w-12 sm:h-12 md:w-8 md:h-8 space-y-1 focus:outline-none sm:space-y-1.5 md:space-y-1"
            aria-label="Toggle mobile menu"
          >
            <motion.span
              animate={isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              className="w-6 h-0.5 bg-text-primary block transition-all"
            />
            <motion.span
              animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-6 h-0.5 bg-text-primary block transition-all"
            />
            <motion.span
              animate={isMobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              className="w-6 h-0.5 bg-text-primary block transition-all"
            />
          </button>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-4 border-t border-surface-border mt-4">
                {isAuthenticated ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      className="block py-2 px-4 sm:py-4 sm:px-6 md:py-2 md:px-4 hover:bg-surface-tertiary rounded-lg transition-colors text-text-primary sm:text-lg md:text-base"
                      onClick={closeMobileMenu}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/workouts" 
                      className="block py-2 px-4 sm:py-4 sm:px-6 md:py-2 md:px-4 hover:bg-surface-tertiary rounded-lg transition-colors text-text-primary sm:text-lg md:text-base"
                      onClick={closeMobileMenu}
                    >
                      Workouts
                    </Link>
                    <Link 
                      to="/nutrition" 
                      className="block py-2 px-4 sm:py-4 sm:px-6 md:py-2 md:px-4 hover:bg-surface-tertiary rounded-lg transition-colors text-text-primary sm:text-lg md:text-base"
                      onClick={closeMobileMenu}
                    >
                      Nutrition
                    </Link>
                    <Link 
                      to="/meal-planning" 
                      className="block py-2 px-4 sm:py-4 sm:px-6 md:py-2 md:px-4 hover:bg-surface-tertiary rounded-lg transition-colors text-text-primary sm:text-lg md:text-base"
                      onClick={closeMobileMenu}
                    >
                      Meal Plans
                    </Link>
                    {!isGuest && (
                      <Link 
                        to="/profile" 
                        className="block py-2 px-4 sm:py-4 sm:px-6 md:py-2 md:px-4 hover:bg-surface-tertiary rounded-lg transition-colors text-text-primary sm:text-lg md:text-base"
                        onClick={closeMobileMenu}
                      >
                        Profile
                      </Link>
                    )}
                    {subscriptionTier === 'premium' && (
                      <Link 
                        to="/food-scan" 
                        className="block py-2 px-4 sm:py-4 sm:px-6 md:py-2 md:px-4 hover:bg-surface-tertiary rounded-lg transition-colors text-text-primary sm:text-lg md:text-base"
                        onClick={closeMobileMenu}
                      >
                        Food Scan
                      </Link>
                    )}
                    <div className="border-t border-surface-border pt-4">
                      {isGuest ? (
                        <Link
                          to="/register"
                          className="btn-primary block w-full text-center sm:py-4 sm:text-lg md:py-2 md:text-base"
                          onClick={closeMobileMenu}
                        >
                          Create Account
                        </Link>
                      ) : (
                        <button
                          onClick={handleLogout}
                          className="btn-secondary block w-full text-center sm:py-4 sm:text-lg md:py-2 md:text-base"
                        >
                          Logout
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      className="block py-2 px-4 sm:py-4 sm:px-6 md:py-2 md:px-4 hover:bg-surface-tertiary rounded-lg transition-colors text-text-primary sm:text-lg md:text-base"
                      onClick={closeMobileMenu}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="btn-primary block w-full text-center sm:py-4 sm:text-lg md:py-2 md:text-base"
                      onClick={closeMobileMenu}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default Header 