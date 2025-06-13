import { NextApiRequest, NextApiResponse } from 'next'
import { api } from '../../../services/api'

// This API route bridges frontend requests to the backend Express server
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' })
    }

    // Configure the request to the backend
    const backendConfig: any = {
      method: req.method,
      url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/user/notification-preferences`,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    }

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      backendConfig.data = req.body
    }

    // Forward the request to the backend
    const response = await api.request(backendConfig)
    
    // Return the backend response
    res.status(response.status).json(response.data)
  } catch (error: any) {
    console.error('Notification preferences API route error:', error)
    
    if (error.response) {
      // Backend returned an error response
      res.status(error.response.status).json(error.response.data)
    } else {
      // Network or other error
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      })
    }
  }
}