import React from 'react'
import { RegisterForm } from '../components/auth/RegisterForm'

const Register: React.FC = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background image */}
      <img
        src="/assets/images/register-bg.jpg"
        alt="Register background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 z-10" />
      <div className="w-full max-w-md space-y-8 relative z-20">
        <RegisterForm />
      </div>
    </div>
  )
}

export default Register 