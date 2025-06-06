import React from 'react';
import { MealPlan } from '../../types/nutrition';

interface ShoppingListProps {
  mealPlan: MealPlan;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ mealPlan }) => {
  if (!mealPlan || mealPlan.length === 0) return <div>No shopping list available.</div>;
  // Flatten all food entries
  const allItems = mealPlan.flatMap(day => day.meals.flatMap(meal => meal.items));
  // Deduplicate by name
  const itemMap = new Map<string, { count: number; entry: typeof allItems[0] }>();
  allItems.forEach(item => {
    if (itemMap.has(item.name)) {
      itemMap.get(item.name)!.count += 1;
    } else {
      itemMap.set(item.name, { count: 1, entry: item });
    }
  });
  const items = Array.from(itemMap.values());
  return (
    <div className="bg-white text-black rounded-xl p-6 shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-4">Shopping List</h2>
      <ul className="space-y-2">
        {items.map(({ entry, count }) => (
          <li key={entry.name} className="flex items-center gap-4 border-b border-gray-200 py-2">
            <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
            <span className="font-semibold">{entry.name}</span>
            <span className="text-gray-500 text-sm">{entry.servingSize} {entry.servingUnit}{count > 1 ? ` ×${count}` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ShoppingList; 