import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { FoodEntry } from '../../types/nutrition';

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
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const barsRef = useRef<(SVGRectElement | null)[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/nutrition-log', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401) {
          setError('Session expired. Please log in again.');
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((logs: NutritionLog[] | null) => {
        if (!logs) return;
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
      .catch(() => {
        setError('Failed to load nutrition analytics.');
        setLoading(false);
      });
  }, []);

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
  if (error) return <div className="mb-4 text-red-500">{error}</div>;

  const maxCalories = Math.max(...data.map(d => d.calories), 1);

  return (
    <div className="mt-8 mb-8">
      <h2 className="text-2xl font-bold mb-4">Weekly Calorie Trend</h2>
      <svg width={420} height={220} className="bg-white rounded shadow" style={{ width: '100%', maxWidth: 420 }}>
        {/* Y axis labels */}
        <text x={10} y={30} fontSize={12} fill="#888">{maxCalories}</text>
        <text x={10} y={200} fontSize={12} fill="#888">0</text>
        {/* Bars */}
        {data.map((d, i) => (
          <g key={d.date}>
            <rect
              ref={el => { barsRef.current[i] = el; }}
              x={50 + i * 50}
              y={200}
              width={30}
              height={0}
              fill="#60a5fa"
              rx={6}
            />
            <text x={65 + i * 50} y={215} fontSize={12} fill="#333" textAnchor="middle">
              {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
            </text>
            <text x={65 + i * 50} y={190 - (d.calories / maxCalories) * 180} fontSize={12} fill="#222" textAnchor="middle">
              {d.calories}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
} 