import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
  const navigate = useNavigate()

  const features = [
    {
      title: 'Personalized Workouts',
      description: 'Get custom workout plans tailored to your goals and fitness level',
      icon: '💪'
    },
    {
      title: 'Nutrition Tracking',
      description: 'Track your meals and get personalized nutrition advice',
      icon: '🥗'
    },
    {
      title: 'Progress Monitoring',
      description: 'Track your progress with detailed analytics and insights',
      icon: '📊'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/images/background.jpg"
            alt="Fitness background"
            className="w-full h-full object-cover opacity-50"
          />
        </div>
        
        <div className="relative z-10 text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Transform Your Fitness Journey
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl mb-8 text-gray-300"
          >
            Your personal AI-powered fitness architect
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col md:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-full text-lg font-semibold transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-8 py-3 bg-transparent border-2 border-white hover:bg-white hover:text-black rounded-full text-lg font-semibold transition-colors"
            >
              View Pricing
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose FitArchitect?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-gray-800 p-8 rounded-xl"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of users who have transformed their lives with FitArchitect
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-full text-lg font-semibold transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Admin Button at the very bottom */}
      <div className="w-full flex justify-end px-4 pb-4">
        <button
          onClick={() => navigate('/admin/login')}
          className="text-xs text-gray-400 hover:text-blue-500 underline focus:outline-none"
          aria-label="Admin Login"
        >
          Admin
        </button>
      </div>
    </div>
  )
}

export default LandingPage 