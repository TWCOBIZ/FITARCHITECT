import React from 'react';
import { CheckIcon, ClockIcon, FireIcon } from '@heroicons/react/24/solid';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useWorkout } from '../../contexts/WorkoutContext';
import { AIGeneratedPlan } from '../../contexts/WorkoutContext';
import { DayStructure } from '../../types/workout';
import ProgressRing from './ProgressRing';

interface ProgramTimelineProps {
  activePlan: AIGeneratedPlan;
  onWorkoutSelect?: (workout: DayStructure, weekIndex: number, dayIndex: number) => void;
  className?: string;
}

const ProgramTimeline: React.FC<ProgramTimelineProps> = ({
  activePlan,
  onWorkoutSelect,
  className = ''
}) => {
  const { getWorkoutCompletionStatus } = useWorkout();

  // Calculate today's date for highlighting
  const today = new Date();
  const todayDateString = today.toISOString().split('T')[0];

  // Get completion status for a workout
  const getCompletionStatus = (weekIndex: number, dayIndex: number) => {
    const workoutKey = `week-${weekIndex}-day-${dayIndex}`;
    return getWorkoutCompletionStatus(activePlan.id, workoutKey);
  };

  // Calculate week completion percentage
  const getWeekCompletion = (week: any, weekIndex: number) => {
    if (!week.days || week.days.length === 0) return 0;
    
    const workoutDays = week.days.filter((day: any) => !day.isRestDay);
    if (workoutDays.length === 0) return 100; // All rest days = 100%
    
    const completedWorkouts = workoutDays.filter((_: any, dayIndex: number) => {
      const status = getCompletionStatus(weekIndex, dayIndex);
      return status.completed;
    });
    
    return Math.round((completedWorkouts.length / workoutDays.length) * 100);
  };

  // Format duration
  const formatDuration = (duration?: number) => {
    // Use user's preferred duration or calculate from exercises
    if (!duration && activePlan?.user?.preferredWorkoutDuration) {
      duration = activePlan.user.preferredWorkoutDuration;
    }
    if (!duration) return '45 min';
    if (duration < 60) return `${duration} min`;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate actual workout duration from exercises
  const calculateWorkoutDuration = (day: any): number => {
    if (!day.exercises || day.exercises.length === 0) {
      return activePlan?.user?.preferredWorkoutDuration || 45;
    }

    let totalDuration = 0;
    day.exercises.forEach((workoutExercise: any, index: number) => {
      const { sets, reps, restTime } = workoutExercise;
      
      // Estimate time per set (2.5 seconds per rep, minimum 30 seconds)
      const timePerSet = Math.max((reps || 10) * 2.5, 30);
      
      // Total exercise time
      const exerciseTime = timePerSet * (sets || 3);
      
      // Rest time between sets and after exercise
      const totalRestTime = ((restTime || 60) * ((sets || 3) - 1)) + 
                           (index < day.exercises.length - 1 ? (restTime || 60) : 0);
      
      totalDuration += exerciseTime + totalRestTime;
    });

    return Math.ceil(totalDuration / 60);
  };

  // Get workout structure breakdown
  const getWorkoutStructure = (day: any): { warmup: number; main: number; cooldown: number } => {
    if (!day.exercises || day.exercises.length === 0) {
      return { warmup: 0, main: 0, cooldown: 0 };
    }

    let warmup = 0, main = 0, cooldown = 0;
    
    day.exercises.forEach((workoutExercise: any) => {
      const exerciseType = workoutExercise.exercise?.type;
      const exerciseName = workoutExercise.exercise?.name?.toLowerCase() || '';
      
      if (exerciseType === 'warmup' || exerciseName.includes('warm') || exerciseName.includes('dynamic')) {
        warmup++;
      } else if (exerciseType === 'cooldown' || exerciseName.includes('stretch') || exerciseName.includes('cool')) {
        cooldown++;
      } else {
        main++;
      }
    });

    return { warmup, main, cooldown };
  };

  // Get day of week label
  const getDayLabel = (dayIndex: number) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[dayIndex % 7];
  };

  // Check if a day is today (simplified for demo)
  const isToday = (weekIndex: number, dayIndex: number) => {
    // Simple logic: assume program starts from current week
    // In a real app, you'd compare with actual start date
    return weekIndex === 0 && dayIndex === today.getDay() - 1;
  };

  // Check if we have any workout data in any format
  const hasWeeksData = activePlan?.weeks && activePlan.weeks.length > 0;
  const hasWorkoutsData = activePlan?.workouts && activePlan.workouts.length > 0;
  
  if (!activePlan || (!hasWeeksData && !hasWorkoutsData)) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 text-center ${className}`}>
        <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Program Timeline</h3>
        <p className="text-gray-400">Create a workout plan to see your program timeline.</p>
      </div>
    );
  }
  
  // Transform workout data to weeks format if needed
  let weeksData = hasWeeksData ? activePlan.weeks : [];
  
  if (!hasWeeksData && hasWorkoutsData) {
    // Transform workouts array to weeks structure for display
    console.log('ProgramTimeline: Converting workouts to weeks format');
    weeksData = [];
    
    // Group workouts into weeks (assuming 3-4 workouts per week)
    const workoutsPerWeek = Math.min(activePlan.workouts.length, 4);
    let currentWeek = 1;
    
    for (let i = 0; i < activePlan.workouts.length; i += workoutsPerWeek) {
      const weekWorkouts = activePlan.workouts.slice(i, i + workoutsPerWeek);
      
      weeksData.push({
        weekNumber: currentWeek,
        days: weekWorkouts.map((workout, dayIndex) => ({
          dayNumber: dayIndex + 1,
          name: workout.name || `Day ${dayIndex + 1}`,
          description: workout.description || 'Workout session',
          exercises: workout.exercises || [],
          type: workout.type || 'strength',
          difficulty: workout.difficulty || 'intermediate',
          duration: workout.duration || 45,
          completed: workout.completed || false
        }))
      });
      
      currentWeek++;
      if (currentWeek > 3) break; // Limit to 3 weeks for timeline display
    }
  }

  return (
    <div className={`bg-gray-900 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Program Timeline</h2>
          <p className="text-gray-400 text-sm">{activePlan.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-sm text-gray-400">Duration</div>
            <div className="text-white font-medium">{activePlan.duration} weeks</div>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {weeksData.map((week: any, weekIndex: number) => {
          const weekCompletion = getWeekCompletion(week, weekIndex);
          
          return (
            <div key={weekIndex} className="bg-gray-800 rounded-lg p-4">
              {/* Week Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Week {weekIndex + 1}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {weekCompletion}% complete
                  </p>
                </div>
                <ProgressRing 
                  progress={weekCompletion}
                  size={40}
                  strokeWidth={3}
                  showPercentage={false}
                />
              </div>

              {/* Days Grid */}
              <div className="space-y-2">
                {week.days && week.days.map((day: any, dayIndex: number) => {
                  const completionStatus = getCompletionStatus(weekIndex, dayIndex);
                  const isCompleted = completionStatus.completed;
                  const isTodayWorkout = isToday(weekIndex, dayIndex);
                  
                  return (
                    <div
                      key={dayIndex}
                      onClick={() => onWorkoutSelect?.(day, weekIndex, dayIndex)}
                      className={`
                        relative p-3 rounded-lg border transition-all duration-200 cursor-pointer
                        ${day.isRestDay 
                          ? 'bg-gray-700 border-gray-600' 
                          : isCompleted
                            ? 'bg-green-900/30 border-green-600/50 hover:bg-green-900/40'
                            : isTodayWorkout
                              ? 'bg-blue-900/30 border-blue-500 hover:bg-blue-900/40 ring-1 ring-blue-500/30'
                              : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        }
                      `}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400 font-medium">
                            {getDayLabel(dayIndex)}
                          </span>
                          {isTodayWorkout && (
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-blue-400 ml-1">Today</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Status Icon */}
                        <div className="flex items-center space-x-1">
                          {day.isRestDay ? (
                            <span className="text-gray-400 text-sm">💤</span>
                          ) : isCompleted ? (
                            <CheckIcon className="w-4 h-4 text-green-400" />
                          ) : (
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Workout Info */}
                      {day.isRestDay ? (
                        <div className="text-sm text-gray-400 italic">Rest Day</div>
                      ) : (
                        <div>
                          <div className={`text-sm font-medium mb-1 ${
                            isCompleted ? 'text-green-300 line-through' : 'text-white'
                          }`}>
                            {day.name || `Day ${dayIndex + 1}`}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span className="flex items-center">
                                <ClockIcon className="w-3 h-3 mr-1" />
                                {formatDuration(calculateWorkoutDuration(day))}
                              </span>
                              
                              {day.exercises && (
                                <span>{day.exercises.length} exercises</span>
                              )}
                            </div>
                            
                            {/* Workout Structure Breakdown */}
                            {day.exercises && day.exercises.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {(() => {
                                  const structure = getWorkoutStructure(day);
                                  const parts = [];
                                  if (structure.warmup > 0) parts.push(`${structure.warmup} warmup`);
                                  if (structure.main > 0) parts.push(`${structure.main} main`);
                                  if (structure.cooldown > 0) parts.push(`${structure.cooldown} cooldown`);
                                  return parts.length > 0 ? parts.join(' • ') : `${day.exercises.length} exercises`;
                                })()}
                              </div>
                            )}
                          </div>
                          
                          {/* Completion Details */}
                          {isCompleted && completionStatus.completedAt && (
                            <div className="text-xs text-green-400 mt-1">
                              {completionStatus.rating && (
                                <span className="mr-2">
                                  {'★'.repeat(completionStatus.rating)}
                                </span>
                              )}
                              Completed {new Date(completionStatus.completedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Today's Workout Glow Effect */}
                      {isTodayWorkout && !day.isRestDay && (
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-20 -z-10"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Week Summary */}
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {week.days?.filter((d: any) => !d.isRestDay).length || 0} workouts
                  </span>
                  <span>
                    {week.days?.filter((_: any, dayIndex: number) => 
                      getCompletionStatus(weekIndex, dayIndex).completed
                    ).length || 0} completed
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Progress Summary */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium mb-1">Overall Progress</h4>
            <p className="text-sm text-gray-400">
              {activePlan.progressData?.completedCount || 0} of {activePlan.progressData?.totalWorkouts || 0} workouts completed
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Overall Progress Ring */}
            <ProgressRing 
              progress={activePlan.progressData?.totalWorkouts 
                ? Math.round((activePlan.progressData.completedCount / activePlan.progressData.totalWorkouts) * 100)
                : 0
              }
              size={50}
              strokeWidth={4}
              showPercentage={true}
            />
            
            {/* Last Completed */}
            {activePlan.lastWorkoutCompleted && (
              <div className="text-right">
                <div className="text-xs text-gray-400">Last workout</div>
                <div className="text-sm text-white">
                  {new Date(activePlan.lastWorkoutCompleted).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramTimeline;