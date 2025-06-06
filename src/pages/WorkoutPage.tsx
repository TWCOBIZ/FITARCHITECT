import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkout } from '../contexts/WorkoutContext'
import { useAuth } from '../contexts/AuthContext'
import WorkoutPlans from '../components/workout/WorkoutPlans'
import WorkoutTracker from '../components/workout/WorkoutTracker'
import WorkoutHistory from '../components/workout/WorkoutHistory'
import WorkoutAnalytics from '../components/workout/WorkoutAnalytics'
import axios from 'axios'
import WorkoutPlanCustomizer from '../components/workout/WorkoutPlanCustomizer'
import { useNavigate, useLocation } from 'react-router-dom'
import { isProfileComplete } from '../utils/helpers'
import { workoutService, generateWorkoutPlanWithRetry } from '../services/workoutService'
import { wgerService } from '../services/wgerService'
import { mapWgerExerciseToCanonical } from '../services/wgerService'
import { toast } from 'react-hot-toast'
import FeatureGateWrapper from '../components/common/FeatureGateWrapper'
import { useWorkoutProfile } from '../hooks/useWorkoutProfile'

type Tab = 'plans' | 'current' | 'tracker' | 'history' | 'analytics'

const defaultPlans = [
  {
    key: 'lose-weight',
    title: 'Lose Weight',
    description: 'A balanced program focused on fat loss, cardio, and full-body strength.',
    weeks: 3,
    details: [
      '3x/week full-body strength',
      '2x/week HIIT cardio',
      'Daily step goal',
      'Progressive overload and calorie deficit tips',
    ],
  },
  {
    key: 'build-muscle',
    title: 'Build Muscle',
    description: 'A hypertrophy-focused split for muscle growth and strength.',
    weeks: 3,
    details: [
      '4x/week upper/lower split',
      'Accessory isolation work',
      'Progressive overload',
      'Nutrition for muscle gain',
    ],
  },
  {
    key: 'increase-endurance',
    title: 'Increase Endurance',
    description: 'A program to boost cardiovascular and muscular endurance.',
    weeks: 3,
    details: [
      '3x/week running/cycling',
      '2x/week circuit training',
      'Mobility and recovery focus',
      'Endurance nutrition guidance',
    ],
  },
];

// Helper to convert default plan to valid WorkoutPlan
function defaultPlanToWorkoutPlan(plan: any): any {
  const now = new Date();
  // Infer muscle groups from title
  let targetMuscleGroups: string[] = [];
  if (plan.key === 'lose-weight') targetMuscleGroups = ['fullBody', 'cardio'];
  if (plan.key === 'build-muscle') targetMuscleGroups = ['upper', 'lower', 'fullBody'];
  if (plan.key === 'increase-endurance') targetMuscleGroups = ['cardio', 'legs', 'core'];
  // Create a generic workout for each week
  const workouts = Array.from({ length: plan.weeks }, (_, i) => ({
    id: `${plan.key}-wk${i+1}`,
    name: `Week ${i+1} Workout`,
    description: plan.details.join(' '),
    type: 'strength',
    difficulty: 'beginner',
    duration: 45,
    exercises: plan.details.map((d: string, idx: number) => ({
      exercise: {
        id: `${plan.key}-ex${idx+1}`,
        name: d.split(' ')[0],
        description: d,
        muscleGroups: targetMuscleGroups,
        equipment: [],
        difficulty: 'beginner',
        instructions: [d],
        videoUrl: '',
        imageUrl: ''
      },
      sets: 3,
      reps: 10,
      restTime: 60
    })),
    targetMuscleGroups,
    equipment: [],
    caloriesBurned: 200,
    createdAt: now,
    updatedAt: now
  }));
  return {
    id: `${plan.key}-${Date.now()}`,
    name: plan.title,
    description: plan.description,
    duration: plan.weeks,
    workouts,
    targetMuscleGroups,
    difficulty: 'beginner',
    createdAt: now,
    updatedAt: now
  };
}

const defaultGoals = [
  'Lose Weight',
  'Build Muscle',
  'Increase Endurance',
  'General Fitness',
];

const defaultEquipment = [
  'Dumbbells',
  'Barbell',
  'Kettlebell',
  'Resistance Bands',
  'Bodyweight',
  'Treadmill',
  'Bike',
];

const WorkoutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('plans')
  const { currentWorkout } = useWorkout()
  const { user } = useAuth()
  const [selectedDefault, setSelectedDefault] = useState<string | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [customizingPlan, setCustomizingPlan] = useState<any | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const workoutProfile = useWorkoutProfile();
  const [selectedGoals, setSelectedGoals] = useState<string[]>(workoutProfile.fitnessGoals ? [workoutProfile.fitnessGoals] : []);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(workoutProfile.availableEquipment || []);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'plans', label: 'Workout Plans' },
    { id: 'current', label: 'Current Plan' },
    { id: 'tracker', label: 'Workout Tracker' },
    { id: 'history', label: 'History' },
    { id: 'analytics', label: 'Analytics' }
  ]

  useEffect(() => {
    if (user?.id) {
      const token = localStorage.getItem('token');
      axios.get('/api/workout-plans', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(res => setWorkoutPlans(res.data))
        .catch(() => setWorkoutPlans([]));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isProfileComplete(user)) {
      navigate('/profile', { state: { from: location.pathname } });
    }
  }, [user, navigate, location]);

  const handleSelectDefault = (key: string) => {
    setSelectedDefault(key);
  };

  const handleStartDefault = () => {
    if (!selectedPlan) return;
    // Transform to valid WorkoutPlan
    const validPlan = defaultPlanToWorkoutPlan(selectedPlan);
    setCustomizingPlan(validPlan);
  };

  const handleSaveCustomizedPlan = async (plan: any) => {
    const token = localStorage.getItem('token');
    const payload = {
      ...plan,
      isDefault: plan.isDefault || false,
      completed: false,
    };
    try {
      const res = await axios.post('/api/workout-plans', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setWorkoutPlans((prev) => [...prev, res.data]);
      setCustomizingPlan(null);
      setSelectedDefault(null);
      setActiveTab('current');
      toast.success('Workout Saved ✓');
    } catch {
      toast.error('Save Failed - Please Try Again');
    }
  };

  const handleDeletePlan = async (id: string) => {
    const token = localStorage.getItem('token');
    await axios.delete('/api/workout-plans', {
      data: { id },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setWorkoutPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMarkComplete = async (id: string) => {
    const token = localStorage.getItem('token');
    const res = await axios.patch('/api/workout-plans', { id, completed: true }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setWorkoutPlans((prev) => prev.map((p) => p.id === id ? { ...p, completed: true } : p));
  };

  const selectedPlan = defaultPlans.find((p) => p.key === selectedDefault);

  const getMissingProfileFields = (profile: any) => {
    const missing: string[] = [];
    if (!profile.fitnessLevel) missing.push('Fitness Level');
    if (!profile.fitnessGoals || profile.fitnessGoals.length === 0) missing.push('Goals');
    if (!profile.availableEquipment || profile.availableEquipment.length === 0) missing.push('Available Equipment');
    if (!profile.daysPerWeek) missing.push('Days Per Week');
    if (!profile.preferredWorkoutDuration) missing.push('Preferred Workout Duration');
    return missing;
  };

  const handleAIGenerate = async () => {
    setAILoading(true);
    setAIError(null);
    const profile = user?.profile;
    console.log('[WorkoutGen] Profile at generation time:', profile);
    if (!profile) {
      setAIError('Profile data is missing. Please complete your profile.');
      setAILoading(false);
      navigate('/profile', { state: { from: location.pathname, message: 'Please complete your profile.' } });
      return;
    }
    // Validate required fields
    const missingFields = getMissingProfileFields(profile);
    if (missingFields.length > 0) {
      setAILoading(false);
      navigate('/profile', { state: { from: location.pathname, missingFields, message: `Please complete your profile: ${missingFields.join(', ')}` } });
      return;
    }
    // Map profile fields to workout generation parameters
    const userProfile = {
      fitnessGoal: (profile.goals && profile.goals[0]) || 'strength',
      experienceLevel: profile.fitnessLevel || 'beginner',
      targetMuscles: profile.goals || [],
      equipment: profile.availableEquipment || [],
      workoutDays: profile.daysPerWeek,
      timePerWorkout: profile.preferredWorkoutDuration
    };
    try {
      const exercises = await wgerService.fetchExercises({ muscles: [], equipment: userProfile.equipment });
      console.log('[WorkoutGen] WGER exercises fetched:', exercises);
      const canonicalExercises = exercises.map(mapWgerExerciseToCanonical);
      console.log('[WorkoutGen] Canonical exercises:', canonicalExercises);
      const plan = await generateWorkoutPlanWithRetry(userProfile, canonicalExercises);
      setCustomizingPlan(plan);
    } catch (err) {
      setAIError('Failed to generate workout plan.');
    } finally {
      setAILoading(false);
    }
  };

  // Allow test user to always generate AI workouts
  const canGenerateAI = user?.email === 'nepacreativeagency@icloud.com' ? true : user?.parqCompleted;

  const handleGoalChange = (goal: string) => {
    setSelectedGoals(g => g.includes(goal) ? g.filter(x => x !== goal) : [...g, goal]);
  };
  const handleEquipmentChange = (eq: string) => {
    setSelectedEquipment(e => e.includes(eq) ? e.filter(x => x !== eq) : [...e, eq]);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/workout/generate', {
        ...workoutProfile,
        fitnessGoals: selectedGoals,
        availableEquipment: selectedEquipment,
      });
      setPlan(res.data.plan);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to generate workout plan.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'plans':
        if (customizingPlan) {
          // Type check: must be an object with id, name, weeks, etc.
          const isValidPlan = customizingPlan && typeof customizingPlan === 'object' && customizingPlan.id && customizingPlan.weeks && Array.isArray(customizingPlan.weeks);
          if (!isValidPlan) {
            return (
              <div className="bg-gray-900 border border-red-700 rounded-xl shadow-lg p-8 mb-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
                <div className="text-gray-300 text-lg">Failed to generate a valid workout plan. Please try again or adjust your inputs.</div>
                <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => setCustomizingPlan(null)}>Back</button>
              </div>
            );
          }
          return <WorkoutPlanCustomizer plan={customizingPlan} onSave={handleSaveCustomizedPlan} onCancel={() => setCustomizingPlan(null)} />;
        }
        return (
          <>
            <button
              className={`mb-4 bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 py-2 rounded shadow hover:from-blue-700 ${!canGenerateAI ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={canGenerateAI ? handleAIGenerate : undefined}
              disabled={!canGenerateAI || aiLoading}
            >
              {aiLoading ? 'Generating...' : 'Generate with AI'}
            </button>
            {!canGenerateAI && (
              <div className="mb-4 text-red-600 font-semibold">You must complete the PAR-Q health assessment before generating a workout plan.</div>
            )}
            {aiError && <div className="text-red-400 mb-2 font-semibold">{aiError}</div>}
            <h2 className="text-xl font-semibold mb-4 mt-8">Choose a Goal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {defaultPlans.map((plan) => (
                <div
                  key={plan.key}
                  className={`transition cursor-pointer rounded-lg p-6 shadow hover:shadow-lg border-2 
                    ${selectedDefault === plan.key
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-800 bg-gray-900 hover:bg-gray-800'}
                  `}
                  onClick={() => handleSelectDefault(plan.key)}
                  tabIndex={0}
                  aria-label={`Select ${plan.title} plan`}
                >
                  <h3 className="text-lg font-bold mb-2 text-white">{plan.title}</h3>
                  <p className="mb-2 text-gray-300">{plan.description}</p>
                  <ul className="text-sm text-gray-400 list-disc pl-5">
                    {plan.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                  <div className="mt-4 text-xs text-gray-500">{plan.weeks} weeks</div>
                </div>
              ))}
            </div>
            {selectedDefault && (
              <div className="flex justify-center mb-8">
                <button
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black"
                  onClick={handleStartDefault}
                >
                  Start Plan
                </button>
              </div>
            )}
          </>
        );
      case 'current':
        // Today's Workout Panel
        if (workoutPlans && workoutPlans.length > 0) {
          // Find the active (not completed) plan
          const activePlan = workoutPlans.find(p => !p.completed);
          if (activePlan && activePlan.days && activePlan.days.length > 0) {
            // Find today's workout (simple: first incomplete day)
            const today = activePlan.days.find((d: any) => !d.completed) || activePlan.days[0];
            return (
              <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-8 mb-8">
                <h2 className="text-3xl font-bold mb-4">Today's Workout</h2>
                <div className="text-gray-400 mb-2 text-lg font-semibold">{activePlan.name} - Week {today.week}, Day {today.day}</div>
                <div className="grid md:grid-cols-2 gap-6">
                  {today.exercises && today.exercises.length > 0 ? (
                    today.exercises.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-black border border-gray-800 rounded-lg p-6 flex flex-col gap-2">
                        <div className="flex items-center gap-4 mb-2">
                          {ex.demoUrl && (
                            <img src={ex.demoUrl} alt={ex.name} className="w-16 h-16 object-cover rounded" />
                          )}
                          <div>
                            <div className="text-xl font-bold text-white">{ex.name}</div>
                            <div className="text-gray-400 text-sm">{ex.muscleGroup}</div>
                          </div>
                        </div>
                        <div className="text-white text-lg">{ex.sets} sets x {ex.reps} reps</div>
                        <div className="text-gray-400 text-sm">Rest: {ex.rest || 60}s</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 col-span-2">No exercises for today.</div>
                  )}
                </div>
              </div>
            );
          }
        }
        // Fallback: no active plan or no days
        return (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-8 mb-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Today's Workout</h2>
            <div className="text-gray-400 text-lg">No active workout plan found. Start a new plan to see your daily workout here!</div>
          </div>
        );
      case 'tracker':
        if (!currentWorkout) {
          return (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Workout</h2>
              <p className="text-gray-600 mb-6">Start a workout from your current plan to begin tracking.</p>
              <button
                onClick={() => setActiveTab('plans')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Workout Plans
              </button>
            </div>
          )
        }
        return <WorkoutTracker />
      case 'history':
        return <WorkoutHistory />
      case 'analytics':
        return <WorkoutAnalytics />
      default:
        return null
    }
  }

  return (
    <FeatureGateWrapper>
      <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-black rounded-lg border border-gray-800 p-8">
          <h1 className="text-3xl font-bold mb-2">Workouts</h1>
          <p className="text-gray-400 mb-8">Track your fitness journey and achieve your goals</p>
          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded font-semibold transition-colors focus:outline-none ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Main Panel Content */}
          <div className="bg-black rounded-lg border border-gray-800 p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </FeatureGateWrapper>
  )
}

export default WorkoutPage 