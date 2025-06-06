import { getSession } from 'next-auth/react';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function getTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }
  return null;
}

async function getUserFromRequest(req) {
  const session = await getSession({ req });
  if (session && session.user?.id) {
    return { userId: session.user.id, type: session.user.type || 'registered', subscription: session.user.subscription || 'free' };
  }
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (typeof payload === 'object' && payload.userId) {
        return { userId: payload.userId, type: payload.type || 'registered', subscription: payload.subscription || 'free' };
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

const BarcodeSchema = z.object({ barcode: z.string().min(5) });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  const userAuth = await getUserFromRequest(req);
  if (!userAuth || !userAuth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (userAuth.subscription !== 'premium') {
    return res.status(403).json({ error: 'Premium required' });
  }
  const parse = BarcodeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid barcode', details: parse.error.errors });
  const { barcode } = parse.data;
  try {
    // OpenFoodFacts API
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('OpenFoodFacts error');
    const data = await resp.json();
    if (!data.product) return res.status(404).json({ error: 'Product not found' });
    const p = data.product;
    const foodEntry = {
      name: p.product_name || 'Unknown',
      calories: Number(p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0),
      protein: Number(p.nutriments['proteins_100g'] || 0),
      carbs: Number(p.nutriments['carbohydrates_100g'] || 0),
      fat: Number(p.nutriments['fat_100g'] || 0),
      servingSize: p.serving_size || '100g',
      servingUnit: 'g',
      imageUrl: p.image_url || '',
      description: p.generic_name || '',
      barcode,
      dietaryRestrictions: [],
      allergens: p.allergens_tags || [],
      ingredients: p.ingredients_text ? p.ingredients_text.split(',').map((i: string) => i.trim()) : [],
      nutritionFacts: {
        fiber: Number(p.nutriments['fiber_100g'] || 0),
        sugar: Number(p.nutriments['sugars_100g'] || 0),
        sodium: Number(p.nutriments['sodium_100g'] || 0),
        cholesterol: Number(p.nutriments['cholesterol_100g'] || 0),
        vitamins: {},
        minerals: {}
      }
    };
    return res.status(200).json({ foodEntry });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch product info' });
  }
} 