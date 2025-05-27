import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' })
    }
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }
    const user = await prisma.userProfile.findUnique({ where: { email } })
    if (!user || !user.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    // Create JWT
    const token = jwt.sign({ userId: user.id, email: user.email, isAdmin: true }, JWT_SECRET, { expiresIn: '1d' })
    res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error: any) {
    console.error('Admin login error:', error)
    res.status(500).json({ message: 'Internal server error', error: error.message, stack: error.stack })
  }
} 