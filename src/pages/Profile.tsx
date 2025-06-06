import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { FaUser, FaDumbbell, FaChartLine, FaCog, FaCamera } from 'react-icons/fa'
import gsap from 'gsap'
import { useUser } from '../contexts/UserContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { useLocation, useNavigate } from 'react-router-dom'
// TODO: Uncomment when NotificationPreferences component is available
// import NotificationPreferences from '../components/NotificationPreferences'

interface UserProfileForm {
  name: string
  email: string
  avatar?: string
  height: number
  weight: number
  age: number
  gender: 'male' | 'female' | 'other'
  fitnessGoals: string[]
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  dietaryPreferences: string[]
  notifications: {
    email: boolean
    telegram: boolean
    telegramChatId?: string
  }
}

const defaultProfile: UserProfileForm = {
  name: '',
  email: '',
  avatar: '',
  height: 0,
  weight: 0,
  age: 0,
  gender: 'male',
  fitnessGoals: [],
  activityLevel: 'moderate',
  dietaryPreferences: [],
  notifications: {
    email: true,
    telegram: false,
    telegramChatId: ''
  }
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
];

// Simple profile completion indicator
const ProfileCompletionIndicator: React.FC<{ profile: any }> = ({ profile }) => {
  const fields = [
    profile.name,
    profile.email,
    profile.height,
    profile.weight,
    profile.age,
    profile.gender,
    profile.fitnessGoals && profile.fitnessGoals.length > 0,
    profile.activityLevel,
    profile.dietaryPreferences && profile.dietaryPreferences.length > 0,
    profile.avatar
  ];
  const filled = fields.filter(Boolean).length;
  const percent = Math.round((filled / fields.length) * 100);
  return (
    <div className="w-full mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-300">Profile Completion</span>
        <span className="text-sm text-gray-400">{percent}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const tabContentRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { updateProfile } = useUser()
  const { user, upgradeGuestAccount, isLoading: authLoading } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeForm, setUpgradeForm] = useState({ name: '', email: '', password: '' })
  const [upgradeError, setUpgradeError] = useState('')
  const [upgradeSuccess, setUpgradeSuccess] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [heightFeet, setHeightFeet] = useState('5')
  const [heightInches, setHeightInches] = useState('6')
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || '/dashboard';
  const [profileData, setProfileData] = useState<any>(null);
  const [summary, setSummary] = useState<any>({});

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors }
  } = useForm<UserProfileForm>({
    defaultValues: defaultProfile
  })

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/api/profile');
        setProfileData(res.data.profile);
        setSummary({
          workout: res.data.workoutSummary,
          calorie: res.data.calorieSummary,
          meal: res.data.mealSummary,
          analytics: res.data.analyticsSummary,
        });
      } catch (e) {
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (tabContentRef.current) {
      gsap.fromTo(tabContentRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
    }
  }, [activeTab])

  useEffect(() => {
    if (avatarRef.current) {
      gsap.fromTo(avatarRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' })
    }
  }, [avatarPreview])

  useEffect(() => {
    if (user?.profile?.height) {
      const total = Number(user.profile.height)
      setHeightFeet(String(Math.floor(total / 12)))
      setHeightInches(String(total % 12))
    }
  }, [user?.profile?.height])

  const showProfileToast = (message: string, type: 'success' | 'error') => {
    toast[type](message, {
      style: {
        background: '#000',
        color: '#fff',
        border: type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
        fontWeight: 'bold',
        fontFamily: 'inherit',
      },
      iconTheme: {
        primary: type === 'success' ? '#10b981' : '#ef4444',
        secondary: '#fff',
      },
    });
  };

  // Add a helper function for client-side validation
  const validateProfileData = (data: UserProfileForm): string[] => {
    const errors: string[] = [];
    if (!data.name) errors.push('Name is required');
    if (!data.email) errors.push('Email is required');
    if (typeof data.height !== 'number' || isNaN(data.height)) errors.push('Height must be a number');
    if (typeof data.weight !== 'number' || isNaN(data.weight)) errors.push('Weight must be a number');
    if (typeof data.age !== 'number' || isNaN(data.age)) errors.push('Age must be a number');
    if (!['male','female','other'].includes(data.gender)) errors.push('Gender is invalid');
    if (!Array.isArray(data.fitnessGoals)) errors.push('Fitness goals must be an array');
    if (!['sedentary','light','moderate','active','very_active'].includes(data.activityLevel)) errors.push('Activity level is invalid');
    if (!Array.isArray(data.dietaryPreferences)) errors.push('Dietary preferences must be an array');
    if (!data.notifications || typeof data.notifications.email !== 'boolean' || typeof data.notifications.telegram !== 'boolean') errors.push('Notification preferences are invalid');
    return errors;
  };

  const onSubmit = async (data: UserProfileForm) => {
    // Client-side validation
    const validationErrors = validateProfileData(data);
    if (validationErrors.length > 0) {
      showProfileToast(validationErrors.join('\n'), 'error');
      return;
    }
    setIsSaving(true);
    try {
      const response = await api.put('/api/profile', data);
      showProfileToast('Profile updated successfully!', 'success');
      // Update user context with new profile data
      if (response && response.data) {
        updateProfile(response.data);
      }
      navigate(from);
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        showProfileToast('A profile with this email already exists. Please use a different email or log in.', 'error');
      } else {
        showProfileToast('Failed to update profile', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Upload to /api/upload-avatar
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const res = await fetch('/api/upload-avatar', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          throw new Error('Failed to upload avatar');
        }
        const data = await res.json();
        if (data.url) {
          setValue('avatar', data.url);
          setAvatarPreview(data.url.startsWith('/avatars/') ? data.url : `/avatars/${data.url}`);
        } else {
          throw new Error('No URL returned from upload');
        }
      } catch (err) {
        toast.error('Failed to upload avatar. Please try again.');
      }
    }
  };

  const handleHeightChange = (feet: string, inches: string) => {
    setHeightFeet(feet)
    setHeightInches(inches)
    const totalInches = parseInt(feet || '0', 10) * 12 + parseInt(inches || '0', 10)
    setValue('height', totalInches)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-black rounded-lg border border-gray-800 p-8">
        {/* Profile Header */}
        <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6 flex items-center space-x-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-700 flex items-center justify-center">
            {profileData?.avatar ? (
              <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <FaUser size={40} className="text-gray-500" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{profileData?.name}</h1>
            <p className="text-gray-400">{profileData?.email}</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {TABS.map(tab => (
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
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-start">
                  <FaDumbbell className="text-blue-400 mb-2" size={28} />
                  <div className="font-bold text-lg">Workouts</div>
                  <div className="text-gray-400">Total: {summary.workout?.total ?? 0}</div>
                  <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => navigate('/workouts')}>Go to Workouts</button>
                </div>
                <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-start">
                  <FaChartLine className="text-green-400 mb-2" size={28} />
                  <div className="font-bold text-lg">Calories</div>
                  <div className="text-gray-400">Today: {summary.calorie?.today ?? 0} / {summary.calorie?.goal ?? 0}</div>
                  <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => navigate('/calories')}>Go to Calories</button>
                </div>
                <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-start">
                  <FaUser className="text-yellow-400 mb-2" size={28} />
                  <div className="font-bold text-lg">Meals</div>
                  <div className="text-gray-400">Next: {summary.meal?.nextMeal ?? 'N/A'}</div>
                  <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => navigate('/meals')}>Go to Meals</button>
                </div>
                <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-start">
                  <FaChartLine className="text-purple-400 mb-2" size={28} />
                  <div className="font-bold text-lg">Analytics</div>
                  <div className="text-gray-400">Progress: {summary.analytics?.weightProgress?.length ?? 0} entries</div>
                  <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => navigate('/analytics')}>Go to Analytics</button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'activity' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              {/* Recent Workouts */}
              <div className="mb-6">
                <div className="font-bold mb-2">Recent Workouts</div>
                {summary.recentWorkouts && summary.recentWorkouts.length > 0 ? (
                  <ul className="text-gray-200">
                    {summary.recentWorkouts.map((w: any) => (
                      <li key={w.id}>{new Date(w.date).toLocaleString()} - {w.notes || 'No notes'}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">No recent workouts.</div>
                )}
              </div>
              {/* Recent Meals */}
              <div className="mb-6">
                <div className="font-bold mb-2">Recent Meals</div>
                {summary.recentMeals && summary.recentMeals.length > 0 ? (
                  <ul className="text-gray-200">
                    {summary.recentMeals.map((m: any) => (
                      <li key={m.id}>{new Date(m.date).toLocaleString()} - {Array.isArray(m.foods) ? m.foods.map((f: any) => typeof f === 'string' ? f : f.name).join(', ') : 'Meal'}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">No recent meals.</div>
                )}
              </div>
              {/* Recent Calorie Logs */}
              <div className="mb-6">
                <div className="font-bold mb-2">Recent Calorie Logs</div>
                {summary.recentCalories && summary.recentCalories.length > 0 ? (
                  <ul className="text-gray-200">
                    {summary.recentCalories.map((c: any) => (
                      <li key={c.id}>{new Date(c.date).toLocaleString()} - {c.calories} kcal</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">No recent calorie logs.</div>
                )}
              </div>
              {/* Weight Progress */}
              <div className="mb-6">
                <div className="font-bold mb-2">Current Weight</div>
                {summary.analytics?.weightProgress?.length > 0 ? (
                  <div className="text-gray-200">{summary.analytics.weightProgress[0].weight} lbs</div>
                ) : (
                  <div className="text-gray-400">No weight data.</div>
                )}
              </div>
              {/* Favorite Foods */}
              <div className="mb-6">
                <div className="font-bold mb-2">Favorite Foods</div>
                {summary.meal?.favoriteFoods && summary.meal.favoriteFoods.length > 0 ? (
                  <ul className="text-gray-200">
                    {summary.meal.favoriteFoods.map((food: string, idx: number) => (
                      <li key={idx}>{food}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">No favorite foods data.</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Settings</h2>
              {/* Profile Completion Indicator */}
              <div className="mb-4">
                <ProfileCompletionIndicator profile={getValues()} />
              </div>
              {/* Profile editing form: add more fields */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-400">Name</label>
                  <input type="text" {...register('name', { required: 'Name is required' })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black" />
                  {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name.message}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Email</label>
                  <input type="email" {...register('email')} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Height (inches)</label>
                  <input type="number" {...register('height', { required: 'Height is required', valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black" />
                  {errors.height && <div className="text-red-500 text-sm mt-1">{errors.height.message}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Weight (lbs)</label>
                  <input type="number" {...register('weight', { required: 'Weight is required', valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black" />
                  {errors.weight && <div className="text-red-500 text-sm mt-1">{errors.weight.message}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Age</label>
                  <input type="number" {...register('age', { required: 'Age is required', valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black" />
                  {errors.age && <div className="text-red-500 text-sm mt-1">{errors.age.message}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Gender</label>
                  <select {...register('gender', { required: 'Gender is required' })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <div className="text-red-500 text-sm mt-1">{errors.gender.message}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Fitness Goals</label>
                  <input type="text" {...register('fitnessGoals', { required: 'Fitness goals are required' })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black" placeholder="Comma-separated goals" />
                  {errors.fitnessGoals && <div className="text-red-500 text-sm mt-1">{errors.fitnessGoals.message}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Activity Level</label>
                  <select {...register('activityLevel', { required: 'Activity level is required' })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black">
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="active">Active</option>
                    <option value="very_active">Very Active</option>
                  </select>
                  {errors.activityLevel && <div className="text-red-500 text-sm mt-1">{errors.activityLevel.message}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Dietary Preferences</label>
                  <input type="text" {...register('dietaryPreferences', { required: 'Dietary preferences are required' })} className="mt-1 block w-full rounded-md border-gray-800 shadow-sm focus:border-white focus:ring-white text-white bg-black" placeholder="Comma-separated preferences" />
                  {errors.dietaryPreferences && <div className="text-red-500 text-sm mt-1">{errors.dietaryPreferences.message}</div>}
                </div>
                {/* Avatar upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-400">Avatar</label>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="mt-1 block w-full text-white bg-black" />
                  {avatarPreview && <img src={avatarPreview} alt="Avatar Preview" className="mt-2 w-20 h-20 rounded-full" />}
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
              </form>
              {/* Notification Preferences */}
              <div className="mt-8">
                <div className="font-bold mb-2">Notification Preferences</div>
                {/* TODO: Uncomment when NotificationPreferences component is available */}
                {/* <NotificationPreferences /> */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile 