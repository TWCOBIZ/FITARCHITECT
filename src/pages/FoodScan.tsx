import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BarcodeScanner from '../components/nutrition/BarcodeScanner';
import ManualFoodEntry from '../components/nutrition/ManualFoodEntry';
import { openFoodFactsService } from '../services/openFoodFactsService';
import { useNutrition } from '../contexts/NutritionContext';
import { useAuth } from '../contexts/AuthContext';
import { FoodEntry } from '../types/nutrition';

const FoodScan: React.FC = () => {
  const { user, hasValidSubscription } = useAuth();
  const navigate = useNavigate();
  
  // Double-check premium access (defense in depth)
  React.useEffect(() => {
    if (!user || !hasValidSubscription('premium')) {
      navigate('/subscription', { 
        state: { 
          message: 'Barcode scanning requires a Premium subscription or 3-day trial',
          feature: 'barcode-scanning'
        } 
      });
    }
  }, [user, hasValidSubscription, navigate]);
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [scannedFood, setScannedFood] = useState<FoodEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addFoodEntry } = useNutrition();

  const handleBarcodeDetected = async (barcode: string) => {
    setLoading(true);
    setError(null);
    setShowScanner(false);
    
    try {
      const food = await openFoodFactsService.getFoodByBarcode(barcode);
      if (food) {
        setScannedFood(food);
      } else {
        setError('Food not found in database. Please try manual entry.');
      }
    } catch (err) {
      setError('Failed to fetch food information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualFoodSubmit = (food: FoodEntry) => {
    addFoodEntry(food);
    setShowManualEntry(false);
    // Show success message
    const event = new CustomEvent('show-toast', {
      detail: { message: 'Food added to nutrition log!', type: 'success' }
    });
    window.dispatchEvent(event);
  };

  const handleAddScannedFood = () => {
    if (scannedFood) {
      addFoodEntry(scannedFood);
      setScannedFood(null);
      // Show success message
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Food added to nutrition log!', type: 'success' }
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Food Scanner</h1>
          <p className="text-gray-400">Scan barcodes or search for foods manually</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${
              activeTab === 'scan'
                ? 'bg-white text-black font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📷 Barcode Scanner
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${
              activeTab === 'manual'
                ? 'bg-white text-black font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔍 Manual Search
          </button>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-900 rounded-lg p-6"
        >
          {activeTab === 'scan' ? (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Barcode Scanner</h2>
              <p className="text-gray-400 mb-6">
                Point your camera at a product barcode to get instant nutrition information.
              </p>
              
              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p>Looking up food information...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-900 border border-red-500 rounded-lg p-4 mb-6">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {scannedFood ? (
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">Scanned Food</h3>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {scannedFood.name}</p>
                    <p><strong>Calories:</strong> {scannedFood.calories} per {scannedFood.servingSize}{scannedFood.servingUnit}</p>
                    <p><strong>Protein:</strong> {scannedFood.protein}g</p>
                    <p><strong>Carbs:</strong> {scannedFood.carbs}g</p>
                    <p><strong>Fat:</strong> {scannedFood.fat}g</p>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={handleAddScannedFood}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add to Nutrition Log
                    </button>
                    <button
                      onClick={() => setScannedFood(null)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Scan Another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg"
                  >
                    📷 Start Scanning
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Manual Food Entry</h2>
              <p className="text-gray-400 mb-6">
                Search for foods and add them to your nutrition log manually.
              </p>
              {showManualEntry ? (
                <ManualFoodEntry
                  onSubmit={handleManualFoodSubmit}
                  onCancel={() => setShowManualEntry(false)}
                />
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg"
                  >
                    🔍 Search Foods
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onClose={() => setShowScanner(false)}
          />
        )}

      </motion.div>
    </div>
  );
};

export default FoodScan;