#!/usr/bin/env node

/**
 * Production Testing Script
 * Tests all FitArchitect systems in Railway production environment
 * Run with: node scripts/test-production.js
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'https://fitarchitect-production.up.railway.app';
const FRONTEND_URL = 'https://fitarchitect-production-78ff.up.railway.app';

// Test admin credentials
const ADMIN_EMAIL = 'admin@fitarchitect.com';
const ADMIN_PASSWORD = 'Legendary23!!';

let authToken = null;

async function authenticateAdmin() {
  console.log('🔐 Authenticating admin user...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      console.log('✅ Admin authentication successful');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Admin authentication failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return false;
  }
}

async function testExerciseSources() {
  console.log('\n🏋️ Testing exercise sources...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/diagnostic/exercise-sources`);
    
    console.log(`   Response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Exercise Sources Test: ${data.summary.passed}/${data.summary.total} passed`);
      console.log(`   Status: ${data.overallStatus}`);
      
      // Show detailed results
      for (const [testName, result] of Object.entries(data.tests)) {
        const status = result.status === 'pass' ? '✅' : 
                      result.status === 'configured' ? '🔧' : '❌';
        console.log(`   ${status} ${testName}: ${result.status}`);
        if (result.error) console.log(`      Error: ${result.error}`);
        if (result.note) console.log(`      Note: ${result.note}`);
      }
      return data;
    } else {
      console.error('❌ Exercise sources test failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Exercise sources test error:', error.message);
    return null;
  }
}

async function testExternalAPIs() {
  console.log('\n🌐 Testing external APIs...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/diagnostic/apis`);
    
    console.log(`   Response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ External API test completed');
      
      // Show ExerciseDB results
      const exerciseDb = data.exerciseDbTest;
      const status = exerciseDb.status === 'success' ? '✅' : 
                    exerciseDb.status === 'not_configured' ? '⚠️' : '❌';
      console.log(`   ${status} ExerciseDB: ${exerciseDb.status}`);
      if (exerciseDb.exerciseCount) {
        console.log(`      Retrieved: ${exerciseDb.exerciseCount} exercises`);
      }
      
      // Show WGER results
      if (data.wgerTest) {
        const wgerStatus = data.wgerTest.status === 'success' ? '✅' : '❌';
        console.log(`   ${wgerStatus} WGER API: ${data.wgerTest.status}`);
        if (data.wgerTest.exerciseCount) {
          console.log(`      Retrieved: ${data.wgerTest.exerciseCount} exercises`);
        }
      }
      
      return data;
    } else {
      console.error('❌ External API test failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ External API test error:', error.message);
    return null;
  }
}

async function testWorkoutGeneration() {
  console.log('\n💪 Testing workout generation...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/workout-plans/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userProfile: {
          fitnessGoals: ['strength'],
          equipmentAvailability: ['dumbbells'],
          preferredWorkoutDuration: 30,
          activityLevel: 'beginner'
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Workout generation successful');
      
      // Check for workouts in the response (the actual structure)
      let exerciseCount = 0;
      let sampleExercise = null;
      
      if (data.workouts && Array.isArray(data.workouts)) {
        // Count exercises across all workouts
        data.workouts.forEach(workout => {
          if (workout.exercises && Array.isArray(workout.exercises)) {
            exerciseCount += workout.exercises.length;
            if (!sampleExercise && workout.exercises[0]) {
              sampleExercise = workout.exercises[0];
            }
          }
        });
      }
      
      // Also check weeks structure
      if (data.weeks && Array.isArray(data.weeks)) {
        data.weeks.forEach(week => {
          if (week.workouts && Array.isArray(week.workouts)) {
            week.workouts.forEach(workout => {
              if (workout.exercises && Array.isArray(workout.exercises)) {
                exerciseCount += workout.exercises.length;
                if (!sampleExercise && workout.exercises[0]) {
                  sampleExercise = workout.exercises[0];
                }
              }
            });
          }
        });
      }
      
      console.log(`   Generated plan with ${exerciseCount} total exercises`);
      if (sampleExercise) {
        const exerciseName = typeof sampleExercise === 'object' ? 
          (sampleExercise.name || sampleExercise.exerciseName || JSON.stringify(sampleExercise).substring(0, 50)) : 
          sampleExercise;
        console.log(`   Sample exercise: ${exerciseName}`);
      }
      
      return { success: true, exerciseCount };
    } else {
      const errorText = await response.text();
      console.error('❌ Workout generation failed:', response.status, errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Workout generation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testSystemHealth() {
  console.log('\n💊 Testing system health...');
  
  try {
    // Test backend health
    const backendResponse = await fetch(`${BACKEND_URL}/health`);
    const backendHealthy = backendResponse.ok;
    console.log(`${backendHealthy ? '✅' : '❌'} Backend health: ${backendResponse.status}`);
    
    // Test frontend accessibility
    const frontendResponse = await fetch(FRONTEND_URL);
    const frontendHealthy = frontendResponse.ok;
    console.log(`${frontendHealthy ? '✅' : '❌'} Frontend health: ${frontendResponse.status}`);
    
    return { backend: backendHealthy, frontend: frontendHealthy };
  } catch (error) {
    console.error('❌ System health test error:', error.message);
    return { backend: false, frontend: false };
  }
}

async function main() {
  console.log('🚀 FitArchitect Production System Test');
  console.log('🌐 Backend:', BACKEND_URL);
  console.log('🌐 Frontend:', FRONTEND_URL);
  console.log('=' .repeat(60));
  
  const results = {
    authentication: false,
    exerciseSources: null,
    externalAPIs: null,
    workoutGeneration: null,
    systemHealth: null
  };
  
  // Test system health first
  results.systemHealth = await testSystemHealth();
  
  // Authenticate admin
  results.authentication = await authenticateAdmin();
  
  if (!results.authentication) {
    console.log('\n❌ Cannot proceed without authentication');
    return results;
  }
  
  // Run all tests
  results.exerciseSources = await testExerciseSources();
  results.externalAPIs = await testExternalAPIs();
  results.workoutGeneration = await testWorkoutGeneration();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('=' .repeat(40));
  console.log(`🔐 Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`💊 System Health: ${results.systemHealth?.backend && results.systemHealth?.frontend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🏋️ Exercise Sources: ${results.exerciseSources?.overallStatus === 'all_systems_operational' ? '✅ PASS' : '⚠️ PARTIAL'}`);
  console.log(`🌐 External APIs: ${results.externalAPIs?.exerciseDbTest?.status === 'success' ? '✅ PASS' : '⚠️ PARTIAL'}`);
  console.log(`💪 Workout Generation: ${results.workoutGeneration?.success ? '✅ PASS' : '❌ FAIL'}`);
  
  const allSystemsGo = results.authentication && 
                      results.systemHealth?.backend && 
                      results.systemHealth?.frontend &&
                      results.exerciseSources &&
                      results.workoutGeneration?.success;
  
  console.log(`\n🎯 Overall Status: ${allSystemsGo ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME ISSUES DETECTED'}`);
  
  return results;
}

// Run the tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});