import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useWorkout } from '../../contexts/WorkoutContext';
import ProgressRing from './ProgressRing';
import WorkoutCompletionCheckbox from './WorkoutCompletionCheckbox';
import WorkoutCompletionModal from './WorkoutCompletionModal';
import CompletionBadge from './CompletionBadge';

interface WorkoutPlansProps {
  workoutPlans: any[];
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

const WorkoutPlans: React.FC<WorkoutPlansProps> = ({ workoutPlans, onDelete, onMarkComplete }) => {
  const { completeIndividualWorkout, uncompleteIndividualWorkout } = useWorkout();
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [completionModal, setCompletionModal] = useState<{
    planId: string;
    workoutId: string;
    workoutName: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const togglePlanExpansion = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const getDetailedProgress = (plan: any) => {
    if (!plan.weeks || !Array.isArray(plan.weeks)) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    let totalWorkouts = 0;
    let completedWorkouts = 0;

    plan.weeks.forEach((week: any, weekIndex: number) => {
      if (week.days && Array.isArray(week.days)) {
        week.days.forEach((day: any, dayIndex: number) => {
          if (!day.isRestDay) {
            totalWorkouts++;
            const workoutKey = `week-${weekIndex}-day-${dayIndex}`;
            if (plan.completedWorkouts?.[workoutKey]?.completed) {
              completedWorkouts++;
            }
          }
        });
      }
    });

    return {
      total: totalWorkouts,
      completed: completedWorkouts,
      percentage: totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0
    };
  };

  const handleWorkoutComplete = async (planId: string, workoutId: string, workoutName: string) => {
    setCompletionModal({ planId, workoutId, workoutName });
  };

  const handleModalComplete = async (rating?: number, notes?: string, duration?: number) => {
    if (!completionModal) return;

    setLoading(true);
    try {
      await completeIndividualWorkout(
        completionModal.planId,
        completionModal.workoutId,
        rating,
        notes,
        duration
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutUncomplete = async (planId: string, workoutId: string) => {
    try {
      await uncompleteIndividualWorkout(planId, workoutId);
    } catch (error) {
      console.error('Failed to uncomplete workout:', error);
    }
  };

  const formatLastCompleted = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4 text-white">Your Saved Plans</h2>
      {workoutPlans.length === 0 ? (
        <div className="text-gray-500">No saved plans yet. Start a default plan or create your own!</div>
      ) : (
        <div className="space-y-4">
          {workoutPlans.map((plan, idx) => {
            const progress = getDetailedProgress(plan);
            const isExpanded = expandedPlans.has(plan.id);
            const lastCompleted = formatLastCompleted(plan.lastWorkoutCompleted);

            return (
              <div
                key={plan.id || idx}
                className={`bg-gray-900 border border-gray-700 rounded-lg shadow-lg transition-all duration-200 ${
                  plan.completed ? 'opacity-80' : 'hover:border-gray-600'
                }`}
              >
                {/* Plan Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                        {plan.completed && <CompletionBadge type="completed" />}
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">{plan.description}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                        <span>{plan.duration} weeks</span>
                        <span>•</span>
                        <span>{progress.total} workouts</span>
                        {lastCompleted && (
                          <>
                            <span>•</span>
                            <span>Last: {lastCompleted}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Ring */}
                    <div className="flex items-center space-x-4">
                      <ProgressRing 
                        progress={progress.percentage} 
                        size={50}
                        strokeWidth={3}
                        showPercentage={true}
                      />
                    </div>
                  </div>

                  {/* Progress Details and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      {progress.completed} of {progress.total} workouts completed
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => togglePlanExpansion(plan.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800"
                      >
                        <span>{isExpanded ? 'Hide' : 'View'} Workouts</span>
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => onDelete(plan.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded-md hover:bg-gray-800"
                        title="Delete plan"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Workout List */}
                {isExpanded && (
                  <div className="border-t border-gray-700 px-6 py-4">
                    {plan.weeks && Array.isArray(plan.weeks) ? (
                      <div className="space-y-4">
                        {plan.weeks.map((week: any, weekIndex: number) => (
                          <div key={weekIndex} className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-300 border-b border-gray-700 pb-1">
                              Week {weekIndex + 1}
                            </h4>
                            
                            {week.days && Array.isArray(week.days) && (
                              <div className="space-y-2 pl-2">
                                {week.days.map((day: any, dayIndex: number) => {
                                  const workoutKey = `week-${weekIndex}-day-${dayIndex}`;
                                  const completionStatus = plan.completedWorkouts?.[workoutKey];
                                  const isCompleted = completionStatus?.completed || false;
                                  
                                  if (day.isRestDay) {
                                    return (
                                      <div key={dayIndex} className="flex items-center space-x-3 py-2 text-gray-500">
                                        <div className="w-6 h-6 flex items-center justify-center">
                                          <span className="text-xs">💤</span>
                                        </div>
                                        <span className="text-sm italic">Rest Day</span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <WorkoutCompletionCheckbox
                                      key={dayIndex}
                                      workoutId={workoutKey}
                                      planId={plan.id}
                                      isCompleted={isCompleted}
                                      completedAt={completionStatus?.completedAt}
                                      rating={completionStatus?.rating}
                                      workoutName={day.name || `Day ${day.dayNumber || dayIndex + 1}`}
                                      onComplete={(planId, workoutId) => 
                                        handleWorkoutComplete(planId, workoutId, day.name || `Day ${day.dayNumber || dayIndex + 1}`)
                                      }
                                      onUncomplete={handleWorkoutUncomplete}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No workouts found in this plan.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Modal */}
      {completionModal && (
        <WorkoutCompletionModal
          isOpen={true}
          onClose={() => setCompletionModal(null)}
          onComplete={handleModalComplete}
          workoutName={completionModal.workoutName}
          loading={loading}
        />
      )}
    </div>
  );
};

export default WorkoutPlans; 