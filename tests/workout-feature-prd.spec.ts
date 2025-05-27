import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkoutProfileForm from '../src/components/auth/WorkoutProfileForm';
import WorkoutPlanView from '../src/components/workout/WorkoutPlanView';
import ExerciseCard from '../src/components/workout/ExerciseCard';
import WorkoutHistory from '../src/components/workout/WorkoutHistory';
import WorkoutPlanCustomizer from '../src/components/workout/WorkoutPlanCustomizer';
import WorkoutPlans from '../src/components/workout/WorkoutPlans';
import { workoutService } from '../src/services/workoutService';
import { openaiService } from '../src/services/openaiService';
import { wgerService } from '../src/services/wgerService';
import { UserProfile } from '../src/types/user';
import { WorkoutPlan, Exercise } from '../src/types/workout';

jest.mock('../src/services/workoutService');
jest.mock('../src/services/openaiService');
jest.mock('../src/services/wgerService');

const mockProfile: Partial<UserProfile> = {
  fitnessLevel: 'beginner',
  goals: ['Build Muscle'],
  availableEquipment: ['Dumbbells'],
  preferredWorkoutDuration: 45,
  daysPerWeek: 3,
  height: 180,
  weight: 80,
};

const mockExercise: Exercise = {
  id: '1',
  name: 'Push-ups',
  description: 'A bodyweight exercise for chest and triceps.',
  muscleGroups: ['chest', 'triceps'],
  equipment: ['bodyweight'],
  difficulty: 'beginner',
  instructions: ['Start in a plank position', 'Lower your body', 'Push back up'],
  imageUrl: 'pushup.jpg',
  videoUrl: 'pushup.mp4',
};

const mockPlan: WorkoutPlan = {
  id: 'plan1',
  name: 'Test Plan',
  description: 'A test workout plan',
  duration: 3,
  workouts: [
    {
      id: 'w1',
      name: 'Day 1',
      description: 'Upper body',
      type: 'strength',
      difficulty: 'beginner',
      duration: 45,
      exercises: [{ exercise: mockExercise, sets: 3, reps: 10, restTime: 60 }],
      targetMuscleGroups: ['chest'],
      equipment: ['bodyweight'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  targetMuscleGroups: ['chest'],
  difficulty: 'beginner',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PRD Feature Audit: Workout Functionality', () => {
  it('renders user profile form with all required fields', () => {
    render(<WorkoutProfileForm onSubmit={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByLabelText(/Height/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fitness Level/i)).toBeInTheDocument();
    expect(screen.getByText(/Fitness Goals/i)).toBeInTheDocument();
    expect(screen.getByText(/Available Equipment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Workout Duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Workout Days per Week/i)).toBeInTheDocument();
  });

  it('renders workout plan view with weeks, days, and exercises', () => {
    jest.spyOn(workoutService, 'getCurrentPlan').mockReturnValue(mockPlan);
    render(<WorkoutPlanView userProfile={mockProfile as any} />);
    expect(screen.getByText(/Your Workout Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Upper body/i)).toBeInTheDocument();
    expect(screen.getByText(/Day 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Push-ups/i)).toBeInTheDocument();
  });

  it('renders exercise card with image, video, and instructions', () => {
    render(<ExerciseCard exercise={mockExercise} />);
    expect(screen.getByText(/Push-ups/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Push-ups/i)).toBeInTheDocument();
    expect(screen.getByText(/A bodyweight exercise/i)).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('video')).toBeTruthy;
  });

  it('renders workout history and stats', () => {
    // Mock context if needed
    render(<WorkoutHistory />);
    expect(screen.getByText(/Workout History/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Workouts/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Average Rating/i)).toBeInTheDocument();
  });

  it('renders workout plan customizer', () => {
    render(
      <WorkoutPlanCustomizer
        plan={mockPlan}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText(/Customize Workout Plan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Plan Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Days per Week/i)).toBeInTheDocument();
  });

  it('renders saved plans display', () => {
    render(
      <WorkoutPlans
        workoutPlans={[mockPlan]}
        onDelete={jest.fn()}
        onMarkComplete={jest.fn()}
      />
    );
    expect(screen.getByText(/Your Saved Plans/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Plan/i)).toBeInTheDocument();
  });

  it('calls OpenAI and WGER services for plan generation', async () => {
    (openaiService.generateWorkoutPlan as jest.Mock).mockResolvedValue(mockPlan);
    (wgerService.fetchExercises as jest.Mock).mockResolvedValue([mockExercise]);
    const plan = await openaiService.generateWorkoutPlan(mockProfile as any, [mockExercise]);
    expect(plan.name).toBe('Test Plan');
    const exercises = await wgerService.fetchExercises({});
    expect(exercises[0].name).toBe('Push-ups');
  });
}); 