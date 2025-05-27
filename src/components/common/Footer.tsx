import React from 'react'
import { Link } from 'react-router-dom'

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">FITARCHITECT</h3>
            <p className="text-gray-400">
              Your personal fitness and nutrition architect
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/workouts" className="text-gray-400 hover:text-white">
                  Workouts
                </Link>
              </li>
              <li>
                <Link to="/nutrition" className="text-gray-400 hover:text-white">
                  Nutrition
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-400 hover:text-white">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {/* Removed FAQ, Contact, and Privacy Policy links to prevent navigation errors */}
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Connect</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://twitter.com/fitarchitect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/fitarchitect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} FITARCHITECT. All rights reserved.</p>
          <div className="mt-2">
            <Link to="/admin/login" className="text-xs text-blue-400 hover:underline">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 