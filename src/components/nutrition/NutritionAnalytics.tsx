import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { FoodEntry } from '../../types/nutrition';
import { useAuth } from '../../contexts/AuthContext';
import { useNutrition } from '../../contexts/NutritionContext';

interface NutritionLog {
  id: string;
  date: string;
  foods: FoodEntry[];
  notes?: string;
}

interface DayData {
  date: string;
  calories: number;
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function NutritionAnalytics() {
  const { user } = useAuth();
  const { dailyLog } = useNutrition();
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const barsRef = useRef<(SVGRectElement | null)[]>([]);

  useEffect(() => {
    // For guests, create simple analytics from current session
    if (user?.isGuest || user?.type === 'guest') {
      const days = getLast7Days();
      const today = new Date().toISOString().slice(0, 10);
      const dayTotals: Record<string, number> = {};
      days.forEach(day => { 
        dayTotals[day] = day === today ? dailyLog.calories : 0; 
      });
      setData(days.map(date => ({ date, calories: dayTotals[date] })));
      setLoading(false);
      return;
    }

    // For registered users, fetch from API
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    fetch('/api/nutrition-log', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then((logs: NutritionLog[]) => {
        const days = getLast7Days();
        const dayTotals: Record<string, number> = {};
        days.forEach(day => { dayTotals[day] = 0; });
        logs.forEach((log: NutritionLog) => {
          const day = log.date?.slice(0, 10);
          if (dayTotals[day] !== undefined && log.foods) {
            log.foods.forEach((food: FoodEntry) => {
              dayTotals[day] += Number(food.calories) || 0;
            });
          }
        });
        setData(days.map(date => ({ date, calories: dayTotals[date] })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, dailyLog]);

  useEffect(() => {
    if (data.length && barsRef.current.length) {
      data.forEach((d, i) => {
        gsap.to(barsRef.current[i], {
          attr: { y: 200 - (d.calories / Math.max(...data.map(x => x.calories || 1)) * 180), height: (d.calories / Math.max(...data.map(x => x.calories || 1)) * 180) },
          duration: 1,
          ease: 'power3.out',
        });
      });
    }
  }, [data]);

  if (loading) return <div className="mb-4">Loading analytics...</div>;

  const maxCalories = Math.max(...data.map(d => d.calories), 1);

  return (
    <div className="mt-8 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Weekly Calorie Trend</h2>
      <div className="bg-gray-900 border border-gray-800 p-4 rounded shadow">
        {user?.isGuest || user?.type === 'guest' ? (
          <div className="text-gray-400 text-center py-8">
            <p className="mb-2">📊 Analytics for guest session</p>
            <p className="text-sm">Today's calories: {dailyLog.calories}</p>
            <p className="text-sm mt-2">Register to track your progress over time!</p>
          </div>
        ) : (
          <svg width={420} height={220} className="bg-gray-800 rounded shadow" style={{ width: '100%', maxWidth: 420 }}>
            {/* Y axis labels */}
            <text x={10} y={30} fontSize={12} fill="#9CA3AF">{maxCalories}</text>
            <text x={10} y={200} fontSize={12} fill="#9CA3AF">0</text>
            {/* Bars */}
            {data.map((d, i) => (
              <g key={d.date}>
                <rect
                  ref={el => { barsRef.current[i] = el; }}
                  x={50 + i * 50}
                  y={200}
                  width={30}
                  height={0}
                  fill="#3B82F6"
                  rx={6}
                />
                <text x={65 + i * 50} y={215} fontSize={12} fill="#D1D5DB" textAnchor="middle">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </text>
                <text x={65 + i * 50} y={190 - (d.calories / maxCalories) * 180} fontSize={12} fill="#F3F4F6" textAnchor="middle">
                  {d.calories}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
} 