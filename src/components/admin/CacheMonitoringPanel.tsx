import React, { useState, useEffect } from 'react';
import { exerciseDbService } from '../../services/exerciseDbService';
import { configService, validateEnvironmentSetup } from '../../services/configService';
import { frontendCache, foodSearchCache, barcodeCache } from '../../services/frontendCacheService';
import { api } from '../../services/api';

interface CacheMetrics {
  exerciseCache: number;
  gifCache: number;
  activeRequests: number;
  hasApiKey: boolean;
  storageUsage: {
    totalBytes: number;
    totalMB: string;
    maxMB: string;
    usagePercentage: string;
  };
  health: {
    gifCacheUtilization: string;
    exerciseCacheUtilization: string;
    expiredGifEntries: number;
    expiredExerciseEntries: number;
  };
  config: {
    maxGifCacheSize: number;
    maxExerciseCacheSize: number;
    cleanupThreshold: number;
    expiryDays: number;
  };
  recommendations: string[];
  overallHealth: 'Good' | 'Fair' | 'Poor';
}

interface BackendCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
  totalItems: number;
  hitRate: number;
}

interface BackendCacheDebugInfo {
  totalItems: number;
  categories: Record<string, number>;
  topKeys: Array<{ key: string; accessCount: number; lastAccessed: Date }>;
  memoryEstimate: string;
}

interface BackendCacheData {
  stats: BackendCacheStats;
  debugInfo: BackendCacheDebugInfo;
  timestamp: string;
}

const CacheMonitoringPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [backendCache, setBackendCache] = useState<BackendCacheData | null>(null);
  const [frontendStats, setFrontendStats] = useState<any>(null);
  const [envValidation, setEnvValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMetrics = async () => {
    try {
      setLoading(true);
      
      // Get exercise cache performance metrics
      const cacheMetrics = exerciseDbService.getPerformanceMetrics();
      setMetrics(cacheMetrics as CacheMetrics);
      
      // Get backend cache stats
      try {
        const backendResponse = await api.get('/api/admin/cache/stats');
        setBackendCache(backendResponse.data);
      } catch (error) {
        console.warn('Failed to load backend cache stats (admin access required):', error);
      }
      
      // Get frontend cache stats
      const frontend = frontendCache.getStats();
      setFrontendStats(frontend);
      
      // Get environment validation
      const envStatus = validateEnvironmentSetup();
      setEnvValidation(envStatus);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh cache metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cache? This will remove all cached exercise GIFs and data.')) {
      exerciseDbService.clearCache();
      refreshMetrics();
    }
  };

  const handleCleanupExpired = () => {
    exerciseDbService.forceCleanupExpired();
    refreshMetrics();
  };

  const handleCleanupBySize = () => {
    exerciseDbService.forceCleanupBySize();
    refreshMetrics();
  };

  const clearBackendCache = async (tags?: string[]) => {
    if (!window.confirm('Are you sure you want to clear the backend cache? This will impact performance temporarily.')) {
      return;
    }

    try {
      await api.post('/api/admin/cache/clear', {
        tags,
        confirm: true
      });
      refreshMetrics();
    } catch (error) {
      console.error('Failed to clear backend cache:', error);
    }
  };

  const clearFrontendCache = (type?: 'food' | 'barcode' | 'all') => {
    if (!window.confirm('Are you sure you want to clear the frontend cache?')) {
      return;
    }

    switch (type) {
      case 'food':
        foodSearchCache.clear();
        break;
      case 'barcode':
        barcodeCache.clear();
        break;
      default:
        frontendCache.clear();
        break;
    }
    refreshMetrics();
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'Good': return 'text-green-600';
      case 'Fair': return 'text-yellow-600';
      case 'Poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading && !metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Cache Performance Monitor</h2>
          <div className="flex space-x-2">
            <button
              onClick={refreshMetrics}
              disabled={loading}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Overall Health Status */}
      {metrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(metrics.overallHealth)}`}>
                {metrics.overallHealth}
              </div>
              <div className="text-sm text-gray-500">Cache Health</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {parseFloat(metrics.storageUsage.usagePercentage).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Storage Used</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.hasApiKey ? 'Connected' : 'Fallback Mode'}
              </div>
              <div className="text-sm text-gray-500">API Status</div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Statistics */}
      {metrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.gifCache}</div>
              <div className="text-sm text-gray-500">GIF Cache Entries</div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(parseFloat(metrics.health.gifCacheUtilization))}`}
                    style={{ width: `${Math.min(parseFloat(metrics.health.gifCacheUtilization), 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.health.gifCacheUtilization}% of {metrics.config.maxGifCacheSize}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.exerciseCache}</div>
              <div className="text-sm text-gray-500">Exercise Cache Entries</div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(parseFloat(metrics.health.exerciseCacheUtilization))}`}
                    style={{ width: `${Math.min(parseFloat(metrics.health.exerciseCacheUtilization), 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.health.exerciseCacheUtilization}% of {metrics.config.maxExerciseCacheSize}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{metrics.activeRequests}</div>
              <div className="text-sm text-gray-500">Active Requests</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{metrics.storageUsage.totalMB}MB</div>
              <div className="text-sm text-gray-500">Storage Used</div>
              <div className="text-xs text-gray-500">
                Limit: {metrics.storageUsage.maxMB}MB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backend Cache Statistics */}
      {backendCache && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Backend Cache (Food & Nutrition)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{backendCache.stats.totalItems}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{backendCache.stats.hitRate}%</div>
              <div className="text-sm text-gray-500">Hit Rate</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{backendCache.debugInfo.memoryEstimate}</div>
              <div className="text-sm text-gray-500">Memory Usage</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{backendCache.stats.hits}</div>
              <div className="text-sm text-gray-500">Cache Hits</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{backendCache.stats.evictions}</div>
              <div className="text-sm text-gray-500">Evictions</div>
            </div>
          </div>

          {/* Categories */}
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-2">Categories</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(backendCache.debugInfo.categories).map(([category, count]) => (
                <div key={category} className="bg-gray-100 rounded p-2 flex justify-between">
                  <span className="text-gray-600 capitalize">{category.replace('_', ' ')}</span>
                  <span className="text-gray-900 font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Accessed Items */}
          {backendCache.debugInfo.topKeys.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-2">Most Accessed</h4>
              <div className="space-y-1">
                {backendCache.debugInfo.topKeys.slice(0, 3).map((item, index) => (
                  <div key={index} className="bg-gray-100 rounded p-2 flex justify-between items-center">
                    <span className="text-gray-600 truncate mr-2">{item.key}</span>
                    <div className="text-right">
                      <span className="text-gray-900 font-semibold">{item.accessCount} hits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backend Cache Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => clearBackendCache()}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear All Backend Cache
            </button>
            {Object.keys(backendCache.debugInfo.categories).map(category => (
              <button
                key={category}
                onClick={() => clearBackendCache([category])}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear {category.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Frontend Cache Statistics */}
      {frontendStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Frontend Cache (Browser)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{frontendStats.size}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{frontendStats.memoryEstimate}</div>
              <div className="text-sm text-gray-500">Memory Usage</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">LocalStorage</div>
              <div className="text-sm text-gray-500">Storage Type</div>
            </div>
          </div>

          {/* Frontend Cache Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => clearFrontendCache('all')}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear All Frontend Cache
            </button>
            <button
              onClick={() => clearFrontendCache('food')}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Food Search
            </button>
            <button
              onClick={() => clearFrontendCache('barcode')}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Barcode Cache
            </button>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {metrics && metrics.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-3">Recommendations</h3>
          <ul className="space-y-2">
            {metrics.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3"></div>
                <span className="text-yellow-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Environment Configuration */}
      {envValidation && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${envValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {envValidation.isValid ? 'Valid' : 'Invalid'}
              </div>
              <div className="text-sm text-gray-500">Configuration</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{envValidation.errors.length}</div>
              <div className="text-sm text-gray-500">Errors</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{envValidation.warnings.length}</div>
              <div className="text-sm text-gray-500">Warnings</div>
            </div>
          </div>

          {envValidation.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-800 mb-2">Configuration Errors</h4>
              <ul className="space-y-1">
                {envValidation.errors.map((error: string, index: number) => (
                  <li key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {envValidation.warnings.length > 0 && (
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Configuration Warnings</h4>
              <ul className="space-y-1">
                {envValidation.warnings.map((warning: string, index: number) => (
                  <li key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cache Management Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleCleanupExpired}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Clean Expired Entries
            {metrics && (metrics.health.expiredGifEntries > 0 || metrics.health.expiredExerciseEntries > 0) && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-xs rounded-full">
                {metrics.health.expiredGifEntries + metrics.health.expiredExerciseEntries}
              </span>
            )}
          </button>
          
          <button
            onClick={handleCleanupBySize}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            Cleanup by Size
          </button>
          
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear All Cache
          </button>
        </div>
        
        {metrics && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Expired entries: {metrics.health.expiredGifEntries} GIFs, {metrics.health.expiredExerciseEntries} exercises</p>
            <p>Cache expiry: {metrics.config.expiryDays} days</p>
            <p>Cleanup threshold: {(metrics.config.cleanupThreshold * 100).toFixed(0)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheMonitoringPanel;