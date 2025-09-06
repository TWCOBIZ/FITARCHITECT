"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkoutTemplateService = void 0;
const logger_1 = require("../utils/logger");
// Comprehensive workout template library
const workoutTemplates = [
    // === BEGINNER TEMPLATES ===
    {
        id: 'beginner-full-body-4week',
        name: 'Beginner Full Body 4-Week Program',
        description: 'A comprehensive 4-week program designed for beginners focusing on full-body strength and basic movement patterns.',
        difficulty: 'beginner',
        duration: 4,
        estimatedDuration: 45,
        targetMuscleGroups: ['full_body', 'core', 'legs', 'chest', 'back'],
        equipment: ['bodyweight'],
        fitnessGoals: ['strength', 'general_fitness', 'muscle_gain'],
        activityLevel: ['sedentary', 'light'],
        weeks: [
            {
                weekNumber: 1,
                name: 'Foundation Week',
                description: 'Building basic movement patterns and establishing routine',
                days: [
                    {
                        dayNumber: 1,
                        name: 'Full Body Basics',
                        description: 'Introduction to fundamental movements',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 30,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 150,
                        exercises: [
                            { name: 'Bodyweight Squats', reps: '10-12', sets: 2, restTime: '60s', description: 'Stand with feet shoulder-width apart, lower into squat position', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Wall Push-ups', reps: '8-10', sets: 2, restTime: '60s', description: 'Stand arm\'s length from wall, push against wall', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Plank Hold', reps: '15-20s', sets: 2, restTime: '60s', description: 'Hold plank position, keep core engaged', muscleGroups: ['core'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 2,
                        name: 'Rest Day',
                        description: 'Light stretching and recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 3,
                        name: 'Movement & Mobility',
                        description: 'Focus on movement quality and flexibility',
                        isRestDay: false,
                        type: 'mobility',
                        difficulty: 'beginner',
                        duration: 25,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 100,
                        exercises: [
                            { name: 'Arm Circles', reps: '10 each direction', sets: 2, restTime: '30s', description: 'Large arm circles forward and backward', muscleGroups: ['shoulders'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Leg Swings', reps: '10 each leg', sets: 2, restTime: '30s', description: 'Hold wall for balance, swing leg front to back', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 4,
                        name: 'Rest Day',
                        description: 'Complete rest and recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 5,
                        name: 'Basic Strength',
                        description: 'Building basic strength patterns',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 35,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 175,
                        exercises: [
                            { name: 'Chair-Assisted Squats', reps: '8-12', sets: 2, restTime: '60s', description: 'Use chair for support if needed', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Knee Push-ups', reps: '5-8', sets: 2, restTime: '60s', description: 'Push-ups from knees', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 6,
                        name: 'Light Activity',
                        description: 'Gentle movement and walk',
                        isRestDay: false,
                        type: 'cardio',
                        difficulty: 'beginner',
                        duration: 20,
                        targetMuscleGroups: ['legs'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 120,
                        exercises: [
                            { name: 'Gentle Walking', reps: '10 minutes', sets: 1, restTime: '0s', description: 'Comfortable pace walking', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 7,
                        name: 'Rest Day',
                        description: 'Complete rest to prepare for next week',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    }
                ]
            },
            {
                weekNumber: 2,
                name: 'Building Week',
                description: 'Increasing volume and introducing new movements',
                days: [
                    {
                        dayNumber: 1,
                        name: 'Progressive Full Body',
                        description: 'Building on week 1 with more volume',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 40,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 200,
                        exercises: [
                            { name: 'Bodyweight Squats', reps: '12-15', sets: 3, restTime: '60s', description: 'Stand with feet shoulder-width apart, lower into squat position', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Incline Push-ups', reps: '8-12', sets: 3, restTime: '60s', description: 'Hands on elevated surface', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Plank Hold', reps: '20-30s', sets: 3, restTime: '60s', description: 'Hold plank position, keep core engaged', muscleGroups: ['core'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 2,
                        name: 'Rest Day',
                        description: 'Active recovery with light stretching',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 3,
                        name: 'Upper Body Focus',
                        description: 'Targeting upper body strength',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 35,
                        targetMuscleGroups: ['chest', 'arms', 'back'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 180,
                        exercises: [
                            { name: 'Wall Push-ups', reps: '12-15', sets: 3, restTime: '60s', description: 'Stand arm\'s length from wall, push against wall', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Superman Hold', reps: '10-15s', sets: 2, restTime: '45s', description: 'Lie face down, lift chest and legs', muscleGroups: ['back'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 4,
                        name: 'Rest Day',
                        description: 'Complete rest and recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 5,
                        name: 'Lower Body Focus',
                        description: 'Strengthening legs and glutes',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 35,
                        targetMuscleGroups: ['legs', 'glutes'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 180,
                        exercises: [
                            { name: 'Chair Squats', reps: '12-15', sets: 3, restTime: '60s', description: 'Sit back to chair, stand up', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Standing Marches', reps: '10 each leg', sets: 2, restTime: '45s', description: 'Lift knee to hip height', muscleGroups: ['legs', 'core'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 6,
                        name: 'Cardio & Flexibility',
                        description: 'Light cardio and stretching',
                        isRestDay: false,
                        type: 'cardio',
                        difficulty: 'beginner',
                        duration: 25,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 140,
                        exercises: [
                            { name: 'Step in Place', reps: '2 minutes', sets: 3, restTime: '30s', description: 'Step up and down in place', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 7,
                        name: 'Rest Day',
                        description: 'Complete rest to prepare for next week',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    }
                ]
            },
            {
                weekNumber: 3,
                name: 'Strengthening Week',
                description: 'Increasing intensity and adding complexity',
                days: [
                    {
                        dayNumber: 1,
                        name: 'Advanced Basics',
                        description: 'More challenging variations of basic movements',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 45,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 220,
                        exercises: [
                            { name: 'Bodyweight Squats', reps: '15-18', sets: 3, restTime: '60s', description: 'Full range squats with good form', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Regular Push-ups', reps: '5-10', sets: 3, restTime: '60s', description: 'Progress to full push-ups', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Plank Hold', reps: '30-45s', sets: 3, restTime: '60s', description: 'Longer plank holds', muscleGroups: ['core'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 2,
                        name: 'Rest Day',
                        description: 'Active recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 3,
                        name: 'Upper Body Challenge',
                        description: 'More challenging upper body exercises',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 40,
                        targetMuscleGroups: ['chest', 'arms', 'back'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 200,
                        exercises: [
                            { name: 'Incline Push-ups', reps: '10-15', sets: 3, restTime: '60s', description: 'Hands on elevated surface', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Tricep Dips (Chair)', reps: '5-8', sets: 2, restTime: '60s', description: 'Using chair or bench', muscleGroups: ['arms'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 4,
                        name: 'Rest Day',
                        description: 'Complete rest and recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 5,
                        name: 'Lower Body Power',
                        description: 'Adding power to lower body movements',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 40,
                        targetMuscleGroups: ['legs', 'glutes'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 200,
                        exercises: [
                            { name: 'Jump Squats (modified)', reps: '8-10', sets: 3, restTime: '60s', description: 'Small jump or rise on toes', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Lunges', reps: '8-10 each leg', sets: 2, restTime: '60s', description: 'Step forward into lunge position', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 6,
                        name: 'Active Recovery',
                        description: 'Movement and flexibility',
                        isRestDay: false,
                        type: 'mobility',
                        difficulty: 'beginner',
                        duration: 30,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 150,
                        exercises: [
                            { name: 'Walking', reps: '15 minutes', sets: 1, restTime: '0s', description: 'Comfortable pace walking', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 7,
                        name: 'Rest Day',
                        description: 'Complete rest to prepare for final week',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    }
                ]
            },
            {
                weekNumber: 4,
                name: 'Mastery Week',
                description: 'Perfecting form and building confidence',
                days: [
                    {
                        dayNumber: 1,
                        name: 'Strength Challenge',
                        description: 'Testing your progress with challenging variations',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 50,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 250,
                        exercises: [
                            { name: 'Jump Squats (modified)', reps: '8-10', sets: 3, restTime: '60s', description: 'Small jump or rise on toes', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Push-up Progression', reps: '8-12', sets: 3, restTime: '60s', description: 'Best push-up variation you can do', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Plank to Downward Dog', reps: '6-8', sets: 3, restTime: '60s', description: 'Move from plank to downward dog', muscleGroups: ['core', 'shoulders'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 2,
                        name: 'Rest Day',
                        description: 'Active recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 3,
                        name: 'Upper Body Finale',
                        description: 'Final upper body challenge',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 45,
                        targetMuscleGroups: ['chest', 'arms', 'back'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 225,
                        exercises: [
                            { name: 'Push-ups (best form)', reps: '10-15', sets: 3, restTime: '60s', description: 'Use your best push-up variation', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Pike Push-ups', reps: '5-8', sets: 2, restTime: '60s', description: 'Push-ups in pike position', muscleGroups: ['shoulders'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 4,
                        name: 'Rest Day',
                        description: 'Recovery day',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    },
                    {
                        dayNumber: 5,
                        name: 'Lower Body Finale',
                        description: 'Final lower body challenge',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'beginner',
                        duration: 45,
                        targetMuscleGroups: ['legs', 'glutes'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 225,
                        exercises: [
                            { name: 'Squats Challenge', reps: '18-20', sets: 3, restTime: '60s', description: 'Show your squat mastery', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Single Leg Glute Bridges', reps: '5-8 each leg', sets: 2, restTime: '60s', description: 'Bridge with one leg extended', muscleGroups: ['glutes'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 6,
                        name: 'Celebration Workout',
                        description: 'A fun final workout celebrating your progress',
                        isRestDay: false,
                        type: 'circuit',
                        difficulty: 'beginner',
                        duration: 30,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 200,
                        exercises: [
                            { name: 'Victory Squats', reps: '15', sets: 2, restTime: '45s', description: 'Celebrate with confident squats', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'beginner' },
                            { name: 'Champion Push-ups', reps: '10', sets: 2, restTime: '45s', description: 'Show your push-up progress', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'beginner' }
                        ]
                    },
                    {
                        dayNumber: 7,
                        name: 'Rest & Reflection',
                        description: 'Complete rest and program completion celebration',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'beginner',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    }
                ]
            }
        ]
    },
    // === INTERMEDIATE TEMPLATE ===
    {
        id: 'intermediate-strength-4week',
        name: 'Intermediate Strength Builder',
        description: '4-week intermediate program focusing on strength gains with progressive overload',
        difficulty: 'intermediate',
        duration: 4,
        estimatedDuration: 60,
        targetMuscleGroups: ['full_body', 'strength', 'power'],
        equipment: ['bodyweight', 'dumbbells', 'resistance_bands'],
        fitnessGoals: ['strength', 'muscle_gain', 'power'],
        activityLevel: ['moderate', 'active'],
        weeks: [
            {
                weekNumber: 1,
                name: 'Strength Foundation',
                description: 'Building base strength with compound movements',
                days: [
                    {
                        dayNumber: 1,
                        name: 'Upper Body Power',
                        description: 'Compound upper body strength training',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'intermediate',
                        duration: 60,
                        targetMuscleGroups: ['chest', 'back', 'shoulders', 'arms'],
                        equipment: ['bodyweight', 'dumbbells'],
                        caloriesBurned: 300,
                        exercises: [
                            { name: 'Push-ups', reps: '12-15', sets: 4, restTime: '60s', description: 'Standard push-ups with perfect form', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Pike Push-ups', reps: '8-10', sets: 3, restTime: '60s', description: 'Push-ups in pike position for shoulders', muscleGroups: ['shoulders'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Tricep Dips', reps: '10-12', sets: 3, restTime: '60s', description: 'Using chair or bench', muscleGroups: ['arms'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Superman', reps: '12-15', sets: 3, restTime: '45s', description: 'Strengthen posterior chain', muscleGroups: ['back'], equipment: ['bodyweight'], difficulty: 'intermediate' }
                        ]
                    },
                    {
                        dayNumber: 2,
                        name: 'Lower Body Power',
                        description: 'Explosive lower body development',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'intermediate',
                        duration: 60,
                        targetMuscleGroups: ['legs', 'glutes', 'power'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 320,
                        exercises: [
                            { name: 'Jump Squats', reps: '12-15', sets: 4, restTime: '60s', description: 'Explosive squat jumps', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Bulgarian Split Squats', reps: '10-12 each leg', sets: 3, restTime: '60s', description: 'Rear foot elevated split squats', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Single Leg Deadlifts', reps: '8-10 each leg', sets: 3, restTime: '60s', description: 'Balance and posterior chain strength', muscleGroups: ['legs', 'glutes'], equipment: ['bodyweight'], difficulty: 'intermediate' }
                        ]
                    },
                    {
                        dayNumber: 3,
                        name: 'Active Recovery',
                        description: 'Light movement and mobility',
                        isRestDay: false,
                        type: 'mobility',
                        difficulty: 'intermediate',
                        duration: 30,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 150,
                        exercises: [
                            { name: 'Dynamic Stretching', reps: '10 minutes', sets: 1, restTime: '0s', description: 'Full body dynamic warm-up', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Yoga Flow', reps: '15 minutes', sets: 1, restTime: '0s', description: 'Gentle yoga sequence', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'intermediate' }
                        ]
                    },
                    {
                        dayNumber: 4,
                        name: 'Core & Conditioning',
                        description: 'Core strength and conditioning work',
                        isRestDay: false,
                        type: 'core',
                        difficulty: 'intermediate',
                        duration: 45,
                        targetMuscleGroups: ['core', 'full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 225,
                        exercises: [
                            { name: 'Plank Variations', reps: '30-45s', sets: 4, restTime: '45s', description: 'Standard, side, and reverse planks', muscleGroups: ['core'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Mountain Climbers', reps: '20-30', sets: 3, restTime: '45s', description: 'High-intensity core and cardio', muscleGroups: ['core', 'legs'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Bicycle Crunches', reps: '15-20 each side', sets: 3, restTime: '45s', description: 'Alternating elbow to knee', muscleGroups: ['core'], equipment: ['bodyweight'], difficulty: 'intermediate' }
                        ]
                    },
                    {
                        dayNumber: 5,
                        name: 'Full Body Circuit',
                        description: 'High-intensity full body workout',
                        isRestDay: false,
                        type: 'circuit',
                        difficulty: 'intermediate',
                        duration: 55,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 350,
                        exercises: [
                            { name: 'Burpees', reps: '8-12', sets: 3, restTime: '60s', description: 'Full body explosive movement', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Jump Lunges', reps: '10-12 each leg', sets: 3, restTime: '60s', description: 'Alternating jump lunges', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Push-up to T', reps: '6-8 each side', sets: 3, restTime: '60s', description: 'Push-up with rotation', muscleGroups: ['chest', 'core'], equipment: ['bodyweight'], difficulty: 'intermediate' }
                        ]
                    },
                    {
                        dayNumber: 6,
                        name: 'Cardio & Flexibility',
                        description: 'Cardiovascular endurance and flexibility',
                        isRestDay: false,
                        type: 'cardio',
                        difficulty: 'intermediate',
                        duration: 40,
                        targetMuscleGroups: ['legs', 'cardio'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 250,
                        exercises: [
                            { name: 'High Knees', reps: '30s on, 30s rest', sets: 5, restTime: '30s', description: 'Rapid high knee lifts', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'intermediate' },
                            { name: 'Butt Kicks', reps: '30s on, 30s rest', sets: 5, restTime: '30s', description: 'Heel to glute kicks', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'intermediate' }
                        ]
                    },
                    {
                        dayNumber: 7,
                        name: 'Rest Day',
                        description: 'Complete rest and recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'intermediate',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    }
                ]
            }
            // Additional weeks would follow similar pattern with progressive overload...
        ]
    },
    // === ADVANCED TEMPLATE ===
    {
        id: 'advanced-hiit-4week',
        name: 'Advanced HIIT Challenge',
        description: 'High-intensity 4-week program for advanced athletes',
        difficulty: 'advanced',
        duration: 4,
        estimatedDuration: 75,
        targetMuscleGroups: ['full_body', 'cardio', 'power'],
        equipment: ['bodyweight', 'dumbbells', 'kettlebells'],
        fitnessGoals: ['weight_loss', 'endurance', 'power'],
        activityLevel: ['very_active'],
        weeks: [
            {
                weekNumber: 1,
                name: 'HIIT Foundation',
                description: 'High-intensity intervals with complex movements',
                days: [
                    {
                        dayNumber: 1,
                        name: 'Full Body HIIT Blast',
                        description: 'Maximum intensity circuit training',
                        isRestDay: false,
                        type: 'hiit',
                        difficulty: 'advanced',
                        duration: 75,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 450,
                        exercises: [
                            { name: 'Burpees', reps: '45s on, 15s rest', sets: 4, restTime: '15s', description: 'Full body explosive movement', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'Mountain Climbers', reps: '45s on, 15s rest', sets: 4, restTime: '15s', description: 'High-intensity core and cardio', muscleGroups: ['core', 'legs'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'Jump Squats', reps: '45s on, 15s rest', sets: 4, restTime: '15s', description: 'Explosive leg power', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'High Knees', reps: '45s on, 15s rest', sets: 4, restTime: '15s', description: 'Maximum intensity cardio', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'advanced' }
                        ]
                    },
                    {
                        dayNumber: 2,
                        name: 'Strength Power',
                        description: 'Advanced strength training',
                        isRestDay: false,
                        type: 'strength',
                        difficulty: 'advanced',
                        duration: 70,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 400,
                        exercises: [
                            { name: 'Single Arm Push-ups', reps: '5-8 each arm', sets: 3, restTime: '90s', description: 'Ultimate push-up challenge', muscleGroups: ['chest', 'arms', 'core'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'Pistol Squats', reps: '5-8 each leg', sets: 3, restTime: '90s', description: 'Single leg squat', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'Handstand Push-ups', reps: '3-6', sets: 3, restTime: '120s', description: 'Ultimate shoulder strength', muscleGroups: ['shoulders', 'arms'], equipment: ['bodyweight'], difficulty: 'advanced' }
                        ]
                    },
                    {
                        dayNumber: 3,
                        name: 'Active Recovery',
                        description: 'Movement quality and recovery',
                        isRestDay: false,
                        type: 'mobility',
                        difficulty: 'advanced',
                        duration: 45,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 200,
                        exercises: [
                            { name: 'Advanced Yoga Flow', reps: '20 minutes', sets: 1, restTime: '0s', description: 'Complex yoga sequence', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'Movement Patterns', reps: '15 minutes', sets: 1, restTime: '0s', description: 'Complex movement drills', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'advanced' }
                        ]
                    },
                    {
                        dayNumber: 4,
                        name: 'Metabolic Conditioning',
                        description: 'High-intensity metabolic training',
                        isRestDay: false,
                        type: 'conditioning',
                        difficulty: 'advanced',
                        duration: 60,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 450,
                        exercises: [
                            { name: 'Tabata Burpees', reps: '20s on, 10s rest', sets: 8, restTime: '10s', description: 'Maximum intensity burpees', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'Plyometric Push-ups', reps: '6-10', sets: 4, restTime: '60s', description: 'Explosive push-ups', muscleGroups: ['chest', 'arms'], equipment: ['bodyweight'], difficulty: 'advanced' }
                        ]
                    },
                    {
                        dayNumber: 5,
                        name: 'Power & Agility',
                        description: 'Explosive power development',
                        isRestDay: false,
                        type: 'power',
                        difficulty: 'advanced',
                        duration: 65,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 400,
                        exercises: [
                            { name: 'Box Jump Burpees', reps: '6-10', sets: 4, restTime: '90s', description: 'Burpee to box jump', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'advanced' },
                            { name: 'Tuck Jumps', reps: '8-12', sets: 4, restTime: '60s', description: 'Maximum vertical jump', muscleGroups: ['legs'], equipment: ['bodyweight'], difficulty: 'advanced' }
                        ]
                    },
                    {
                        dayNumber: 6,
                        name: 'Endurance Challenge',
                        description: 'Cardiovascular endurance test',
                        isRestDay: false,
                        type: 'endurance',
                        difficulty: 'advanced',
                        duration: 50,
                        targetMuscleGroups: ['full_body'],
                        equipment: ['bodyweight'],
                        caloriesBurned: 400,
                        exercises: [
                            { name: 'EMOM Burpees', reps: '10 burpees every minute', sets: 10, restTime: 'variable', description: 'Every minute on the minute', muscleGroups: ['full_body'], equipment: ['bodyweight'], difficulty: 'advanced' }
                        ]
                    },
                    {
                        dayNumber: 7,
                        name: 'Rest Day',
                        description: 'Complete recovery',
                        isRestDay: true,
                        type: 'rest',
                        difficulty: 'advanced',
                        duration: 0,
                        targetMuscleGroups: [],
                        equipment: [],
                        caloriesBurned: 0,
                        exercises: []
                    }
                ]
            }
            // Additional weeks would follow similar pattern with increased intensity...
        ]
    }
];
class WorkoutTemplateService {
    /**
     * Find the best matching workout template for a user
     */
    static findBestTemplate(user) {
        logger_1.logger.info('Finding best workout template', {
            userId: user.id,
            fitnessGoals: user.fitnessGoals,
            activityLevel: user.activityLevel,
            equipmentAvailability: user.equipmentAvailability
        });
        const scores = workoutTemplates.map(template => {
            var _a;
            let score = 0;
            const reasons = [];
            // Fitness goals matching (weight: 30%)
            const goalMatch = ((_a = user.fitnessGoals) === null || _a === void 0 ? void 0 : _a.some(goal => template.fitnessGoals.includes(goal))) || false;
            if (goalMatch) {
                score += 30;
                reasons.push('Matches fitness goals');
            }
            // Activity level matching (weight: 25%)
            if (template.activityLevel.includes(user.activityLevel || '')) {
                score += 25;
                reasons.push('Matches activity level');
            }
            // Equipment availability (weight: 20%)
            const hasRequiredEquipment = template.equipment.every(equip => { var _a; return ((_a = user.equipmentAvailability) === null || _a === void 0 ? void 0 : _a.includes(equip)) || equip === 'bodyweight'; });
            if (hasRequiredEquipment) {
                score += 20;
                reasons.push('Has required equipment');
            }
            // Difficulty appropriateness (weight: 15%)
            const difficultyScore = this.getDifficultyScore(user, template.difficulty);
            score += difficultyScore * 15;
            if (difficultyScore > 0.5) {
                reasons.push('Appropriate difficulty level');
            }
            // Muscle group preferences (weight: 10%)
            // This is simplified - in a real system you might have more specific preferences
            score += 10;
            reasons.push('Targets desired muscle groups');
            return {
                templateId: template.id,
                score,
                reasons
            };
        });
        // Sort by score and get the best match
        scores.sort((a, b) => b.score - a.score);
        const bestMatch = scores[0];
        const selectedTemplate = workoutTemplates.find(t => t.id === bestMatch.templateId);
        if (!selectedTemplate) {
            // Fallback to first beginner template
            logger_1.logger.warn('No template found, using fallback', { userId: user.id });
            return workoutTemplates[0];
        }
        logger_1.logger.info('Template matched successfully', {
            userId: user.id,
            templateId: selectedTemplate.id,
            score: bestMatch.score,
            reasons: bestMatch.reasons
        });
        return selectedTemplate;
    }
    /**
     * Get difficulty score based on user profile
     */
    static getDifficultyScore(user, templateDifficulty) {
        const activityLevel = user.activityLevel;
        const age = user.age || 30;
        // Simple scoring based on activity level and age
        let userLevel = 'beginner';
        if (activityLevel === 'very_active' && age < 40) {
            userLevel = 'advanced';
        }
        else if (activityLevel === 'active' || (activityLevel === 'moderate' && age < 50)) {
            userLevel = 'intermediate';
        }
        // Perfect match gets 1.0, adjacent gets 0.7, mismatch gets 0.3
        if (userLevel === templateDifficulty)
            return 1.0;
        const levels = ['beginner', 'intermediate', 'advanced'];
        const userIndex = levels.indexOf(userLevel);
        const templateIndex = levels.indexOf(templateDifficulty);
        if (Math.abs(userIndex - templateIndex) === 1)
            return 0.7;
        return 0.3;
    }
    /**
     * Get all available templates
     */
    static getAllTemplates() {
        return workoutTemplates;
    }
    /**
     * Get template by ID
     */
    static getTemplateById(id) {
        return workoutTemplates.find(template => template.id === id);
    }
    /**
     * Convert template to the format expected by the frontend
     */
    static convertTemplateToWorkoutPlan(template) {
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            duration: template.duration,
            difficulty: template.difficulty,
            targetMuscleGroups: template.targetMuscleGroups,
            equipment: template.equipment,
            weeks: template.weeks,
            estimatedDuration: template.estimatedDuration,
            source: 'template'
        };
    }
}
exports.WorkoutTemplateService = WorkoutTemplateService;
