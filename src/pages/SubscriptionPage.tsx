import React from 'react'
import { useNavigate } from 'react-router-dom'

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate()
  React.useEffect(() => { navigate('/pricing', { replace: true }) }, [navigate])
  return null
}

export default SubscriptionPage 