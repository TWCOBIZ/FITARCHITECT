import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
})

const BASIC_PLAN_ID = process.env.STRIPE_BASIC_PLAN_ID as string
const PREMIUM_PLAN_ID = process.env.STRIPE_PREMIUM_PLAN_ID as string

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch the price objects for Basic and Premium
    const prices = await stripe.prices.list({
      active: true,
      limit: 10,
      expand: ['data.product'],
    })
    const filtered = prices.data.filter(
      (p) => p.id === BASIC_PLAN_ID || p.id === PREMIUM_PLAN_ID
    )
    const result = filtered.map((p) => ({
      id: p.id,
      unit_amount: p.unit_amount,
      product: typeof p.product === 'object' ? p.product.name : p.product,
    }))
    res.status(200).json(result)
  } catch (error) {
    console.error('Error fetching Stripe plans:', error)
    res.status(500).json({ error: 'Failed to fetch plans' })
  }
} 