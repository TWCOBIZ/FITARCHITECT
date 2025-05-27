import React from 'react';

interface WorkoutPlansProps {
  workoutPlans: any[];
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

const WorkoutPlans: React.FC<WorkoutPlansProps> = ({ workoutPlans, onDelete, onMarkComplete }) => {
  const getProgress = (plan: any) => {
    const total = plan.workouts?.length || 0;
    const completed = plan.completedWorkouts || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Your Saved Plans</h2>
      {workoutPlans.length === 0 ? (
        <div className="text-gray-500">No saved plans yet. Start a default plan or create your own!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workoutPlans.map((plan, idx) => {
            const progress = getProgress(plan);
            return (
              <div
                key={plan.id || idx}
                className={`bg-black border border-gray-800 rounded-lg p-6 shadow relative text-white ${plan.completed ? 'opacity-60' : 'hover:bg-gray-900'}`}
              >
                <h3 className="text-lg font-bold mb-2 text-white">{plan.name}</h3>
                <p className="mb-2 text-gray-400">{plan.description}</p>
                <div className="text-xs text-gray-500 mb-2">{plan.duration} weeks</div>
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{progress}% Complete</div>
                </div>
                {plan.completed && (
                  <div className="absolute top-2 right-2 text-green-400 font-bold">Completed</div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    className="bg-red-900 text-red-300 px-3 py-1 rounded hover:bg-red-800 text-xs"
                    onClick={() => onDelete(plan.id)}
                  >
                    Delete
                  </button>
                  {!plan.completed && (
                    <button
                      className="bg-green-900 text-green-300 px-3 py-1 rounded hover:bg-green-800 text-xs"
                      onClick={() => onMarkComplete(plan.id)}
                    >
                      Mark as Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkoutPlans; 