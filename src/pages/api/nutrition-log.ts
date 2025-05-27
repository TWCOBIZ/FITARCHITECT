import { getSession } from 'next-auth/client';
import { db } from '../../lib/db';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user.id;

  switch (req.method) {
    case 'GET': {
      // Fetch all logs for user
      const logs = await db.nutritionLog.findMany({ where: { userId } });
      return res.status(200).json(logs);
    }
    case 'POST': {
      // Validate and save new log
      const { date, foods, calories, macros, notes } = req.body;
      if (!date || !foods || !Array.isArray(foods)) return res.status(400).json({ error: 'Invalid input' });
      const log = await db.nutritionLog.create({ data: { userId, date, foods, calories, macros, notes } });
      return res.status(201).json(log);
    }
    case 'PUT': {
      // Update existing log
      const { id, ...update } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing log id' });
      const log = await db.nutritionLog.update({ where: { id, userId }, data: update });
      return res.status(200).json(log);
    }
    case 'DELETE': {
      // Delete log
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing log id' });
      await db.nutritionLog.delete({ where: { id, userId } });
      return res.status(204).end();
    }
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
} 