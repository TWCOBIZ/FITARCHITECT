import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import logo from '/assets/images/logo.png'

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useUser()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-black text-white">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center text-2xl font-bold gap-2">
            <img src={logo} alt="Logo" className="h-8 w-8" />
            FITARCHITECT
          </Link>

          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link to="/workouts" className="hover:text-gray-300">
                  Workouts
                </Link>
                <Link to="/nutrition" className="hover:text-gray-300">
                  Nutrition
                </Link>
                <Link to="/profile" className="hover:text-gray-300">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-gray-300">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Header 