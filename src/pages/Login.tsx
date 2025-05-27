import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoginForm } from '../components/auth/LoginForm'

const Login: React.FC = () => {
  return <LoginForm />
}

export default Login 