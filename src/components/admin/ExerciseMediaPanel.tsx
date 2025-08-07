import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';
import { unifiedGifRegistry, GifRegistryEntry } from '../../services/UnifiedGifRegistry';

interface ExerciseGifMapping {
  exerciseName: string;
  gifPath: string;
  category: string;
  size: number;
  lastModified: string;
  // Approval system fields
  id?: string;
  approvalStatus?: 'pending' | 'approved' | 'flagged' | 'hidden';
  lastReviewedAt?: string;
  reviewedBy?: string;
  flaggedReason?: string;
  hideGif?: boolean;
}

interface AvailableGif {
  path: string;
  name: string;
  category: string;
  size: number;
  lastModified: string;
}

const ExerciseMediaPanel: React.FC = () => {
  const [registryEntries, setRegistryEntries] = useState<GifRegistryEntry[]>([]);
  const [availableGifs, setAvailableGifs] = useState<AvailableGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registryStats, setRegistryStats] = useState<any>(null);
  
  // Filters and search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mappingFilter, setMappingFilter] = useState('all'); // all, mapped, unmapped
  const [approvalFilter, setApprovalFilter] = useState('all'); // all, pending, approved, flagged, hidden
  
  // Edit mode
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  
  // Modal states
  const [showGifSelector, setShowGifSelector] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDetails, setEditingDetails] = useState<ExerciseGifMapping | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Bulk operations
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Upload states
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadCategory, setUploadCategory] = useState('strength');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize the unified registry to ensure it's up to date
      await unifiedGifRegistry.initialize(true); // Force refresh
      
      // Get all registry entries directly from the unified registry
      const entries = unifiedGifRegistry.getAllEntries(); // All entries including unapproved
      setRegistryEntries(entries);
      
      // Get registry statistics
      const stats = unifiedGifRegistry.getRegistryStats();
      setRegistryStats(stats);
      
      // Fetch available GIFs from the backend API (for upload/assignment purposes)
      try {
        const gifsResponse = await api.get('/api/admin/gif-files');
        const transformedGifs = gifsResponse.data.map((gif: any) => ({
          path: gif.path,
          name: gif.filename,
          category: gif.category || 'general',
          size: gif.size || 0,
          lastModified: gif.lastModified || new Date().toISOString()
        }));
        setAvailableGifs(transformedGifs);
      } catch (gifError) {
        console.warn('Failed to fetch available GIFs from API, using registry data:', gifError);
        // Fallback: use registry entries as available GIFs
        const fallbackGifs = entries.map(entry => ({
          path: entry.gifPath,
          name: entry.filename,
          category: entry.category,
          size: entry.fileSize || 0,
          lastModified: entry.lastModified?.toISOString() || new Date().toISOString()
        }));
        setAvailableGifs(fallbackGifs);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load exercise media data');
      toast.error('Failed to load exercise media data from UnifiedGifRegistry');
      console.error('ExerciseMediaPanel fetchData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateExerciseGif = async (exerciseName: string, newGifPath: string) => {
    try {
      await api.patch(`/api/admin/exercise-media/mappings/${encodeURIComponent(exerciseName)}`, {
        gifPath: newGifPath
      });
      
      toast.success(`Updated GIF for ${exerciseName}`);
      fetchData(); // Refresh data
      setEditingExercise(null);
      setSelectedGif(null);
      setShowGifSelector(false);
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update exercise GIF');
    }
  };

  const removeExerciseGif = async (exerciseName: string) => {
    try {
      await api.delete(`/api/admin/exercise-media/mappings/${encodeURIComponent(exerciseName)}`);
      
      toast.success(`Removed GIF mapping for ${exerciseName}`);
      fetchData(); // Refresh data
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove exercise GIF');
    }
  };

  const handleBulkAssignment = async () => {
    try {
      const response = await api.post('/api/admin/exercise-media/bulk-assign');
      
      toast.success(`Bulk assigned ${response.data.assigned} GIFs`);
      fetchData(); // Refresh data
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to bulk assign GIFs');
    }
  };

  // Approval system functions
  const updateApprovalStatus = async (exerciseId: string, approvalStatus: string, flaggedReason?: string, hideGif?: boolean) => {
    try {
      // Use the unified registry's approval update method
      const success = await unifiedGifRegistry.updateApprovalStatus(
        exerciseId, 
        approvalStatus as 'approved' | 'pending' | 'flagged' | 'hidden',
        'admin', // reviewedBy
        flaggedReason
      );
      
      if (success) {
        toast.success(`Exercise ${approvalStatus}`);
        fetchData(); // Refresh data
      } else {
        throw new Error('Failed to update approval status in registry');
      }
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to update approval status');
    }
  };

  const handleBulkApproval = async (approvalStatus: string) => {
    if (selectedExercises.length === 0) {
      toast.error('Please select exercises to approve');
      return;
    }
    
    setBulkLoading(true);
    try {
      // Use the new bulk approve API endpoint
      await api.post('/api/admin/bulk-approve-gifs', {
        exerciseIds: selectedExercises,
        approvalStatus,
        reviewedBy: 'admin'
      });
      
      toast.success(`${selectedExercises.length} exercises ${approvalStatus}`);
      setSelectedExercises([]);
      
      // Refresh the unified registry to reflect changes
      await unifiedGifRegistry.refresh();
      fetchData(); // Refresh data
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to bulk approve');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleUpdateDetails = async (exerciseId: string, name: string, description: string, category: string) => {
    try {
      await api.patch(`/api/admin/exercise-media/details/${exerciseId}`, {
        name,
        description,
        category
      });
      
      toast.success('Exercise details updated');
      fetchData(); // Refresh data
      setShowEditModal(false);
      setEditingDetails(null);
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update exercise details');
    }
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredMappings.map(m => m.id).filter(Boolean) as string[];
    setSelectedExercises(visibleIds);
  };

  const clearSelection = () => {
    setSelectedExercises([]);
  };

  const refreshRegistry = async () => {
    setBulkLoading(true);
    try {
      await unifiedGifRegistry.refresh();
      toast.success('Registry refreshed successfully');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to refresh registry');
    } finally {
      setBulkLoading(false);
    }
  };

  const hideAllWarmupGifs = async () => {
    const warmupExercises = registryEntries.filter(entry => 
      entry.exerciseName.toLowerCase().includes('warmup') || 
      entry.exerciseName.toLowerCase().includes('warm up') ||
      entry.category === 'warmup' ||
      // Add specific warmup exercise names
      ['arm circles', 'shoulder rolls', 'walking lunge', 'torso twists', 
       'hip circles', 'walking high knees', 'butt kickers'].includes(entry.exerciseName.toLowerCase())
    ).map(entry => entry.id);
    
    if (warmupExercises.length === 0) {
      toast.error('No warmup exercises found');
      return;
    }
    
    setBulkLoading(true);
    try {
      await api.post('/api/admin/bulk-approve-gifs', {
        exerciseIds: warmupExercises,
        approvalStatus: 'hidden',
        reviewedBy: 'admin'
      });
      
      toast.success(`Hidden ${warmupExercises.length} warmup exercise GIFs`);
      await unifiedGifRegistry.refresh();
      fetchData();
      
    } catch (err: any) {
      toast.error('Failed to hide warmup GIFs');
    } finally {
      setBulkLoading(false);
    }
  };

  // Emergency fix for specific problematic warmup exercises
  const emergencyFixWarmupGifs = async () => {
    setBulkLoading(true);
    try {
      const response = await api.post('/api/admin/exercise-media/emergency-fix-warmup-gifs');
      
      toast.success(`Emergency fixed ${response.data.fixed} warmup exercise GIFs`);
      fetchData();
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Emergency fix failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Create warmup directory and setup structure
  const setupWarmupDirectory = async () => {
    setBulkLoading(true);
    try {
      await api.post('/api/admin/exercise-media/setup-warmup-directory');
      toast.success('Warmup directory structure created');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to setup warmup directory');
    } finally {
      setBulkLoading(false);
    }
  };

  // Validate GIF directory structure for production deployment
  const validateGifStructure = async () => {
    setBulkLoading(true);
    try {
      const response = await api.get('/api/admin/exercise-media/validate-gif-structure');
      const validation = response.data;
      
      if (validation.missingDirs.length === 0) {
        toast.success(`✅ All directories valid: ${validation.totalGifs} GIFs available`);
      } else {
        toast.error(`⚠️ Missing directories: ${validation.missingDirs.join(', ')}`);
      }
      
      console.log('GIF Structure Validation:', validation);
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to validate GIF structure');
    } finally {
      setBulkLoading(false);
    }
  };

  // Upload functionality
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    validateAndAddFiles(files);
  };

  const validateAndAddFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isGif = file.type === 'image/gif';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isGif) {
        toast.error(`${file.name} is not a GIF file`);
        return false;
      }
      
      if (!isValidSize) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      
      return true;
    });

    setUploadFiles(prev => [...prev, ...validFiles]);
    setUploadError(null);
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append('gifs', file);
      });
      formData.append('category', uploadCategory);

      const response = await api.post('/api/admin/exercise-media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          // Update overall progress
          setUploadProgress(prev => ({ ...prev, overall: percentCompleted }));
        }
      });

      toast.success(`Successfully uploaded ${response.data.uploaded} GIFs`);
      setUploadFiles([]);
      setUploadProgress({});
      setShowUploadModal(false);
      fetchData(); // Refresh the GIF list
      
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Failed to upload GIFs');
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Filter data
  const categories = [...new Set(registryEntries.map(entry => entry.category))];
  
  const filteredMappings = registryEntries.filter(entry => {
    const matchesSearch = entry.exerciseName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
    const matchesMapping = mappingFilter === 'all' || 
      (mappingFilter === 'mapped' && entry.gifPath) ||
      (mappingFilter === 'unmapped' && !entry.gifPath);
    const matchesApproval = approvalFilter === 'all' || entry.approvalStatus === approvalFilter;
    
    return matchesSearch && matchesCategory && matchesMapping && matchesApproval;
  });

  const filteredGifs = availableGifs.filter(gif => {
    const matchesSearch = gif.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || gif.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading exercise media data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-400 mb-4">⚠️ Error loading data</div>
        <p className="text-gray-400 mb-4">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">UnifiedGifRegistry Management & Approval</h2>
          <div className="text-gray-400 mt-1 space-y-1">
            <p>Intelligent GIF-to-exercise mapping with filename-based matching and admin approval workflow</p>
            {registryStats && (
              <div className="flex gap-4 text-sm">
                <span>📊 {registryStats.totalEntries} total entries</span>
                <span>✅ {registryStats.approvalStatusCounts.approved || 0} approved</span>
                <span>⏳ {registryStats.approvalStatusCounts.pending || 0} pending</span>
                <span>🚩 {registryStats.approvalStatusCounts.flagged || 0} flagged</span>
                <span>👁️ {registryStats.approvalStatusCounts.hidden || 0} hidden</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
          >
            📤 Upload GIFs
          </button>
          
          <button
            onClick={handleBulkAssignment}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            🔄 Auto-Assign
          </button>
          
          <button
            onClick={emergencyFixWarmupGifs}
            disabled={bulkLoading}
            className="px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
            title="Emergency fix for warmup GIF mappings"
          >
            🚨 Fix Warmup GIFs
          </button>
          
          <button
            onClick={setupWarmupDirectory}
            disabled={bulkLoading}
            className="px-3 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors disabled:opacity-50"
            title="Create warmup directory structure"
          >
            📁 Setup Warmup Dir
          </button>
          
          <button
            onClick={hideAllWarmupGifs}
            disabled={bulkLoading}
            className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            🚫 Hide Warmup GIFs
          </button>
          
          <button
            onClick={validateGifStructure}
            disabled={bulkLoading}
            className="px-3 py-2 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 transition-colors disabled:opacity-50"
            title="Validate GIF directory structure for deployment"
          >
            ✅ Validate Structure
          </button>
          
          <button
            onClick={refreshRegistry}
            disabled={bulkLoading}
            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
            title="Refresh UnifiedGifRegistry from filesystem and database"
          >
            🔄 Refresh Registry
          </button>
          
          <button
            onClick={fetchData}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Reload Data
          </button>
        </div>
      </div>
      
      {/* Bulk Operations */}
      {selectedExercises.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <span className="font-medium">{selectedExercises.length}</span> exercises selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkApproval('approved')}
                disabled={bulkLoading}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                ✅ Approve All
              </button>
              <button
                onClick={() => handleBulkApproval('flagged')}
                disabled={bulkLoading}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                🚩 Flag All
              </button>
              <button
                onClick={() => handleBulkApproval('hidden')}
                disabled={bulkLoading}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                👁️ Hide All
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search Exercises</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by exercise name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mapping Status</label>
            <select
              value={mappingFilter}
              onChange={(e) => setMappingFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Exercises</option>
              <option value="mapped">With GIFs</option>
              <option value="unmapped">Without GIFs</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Approval Status</label>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="flagged">🚩 Flagged</option>
              <option value="hidden">👁️ Hidden</option>
            </select>
          </div>
          
          <div className="flex flex-col justify-between">
            <div className="text-sm text-gray-400 space-y-1">
              <div>Total: {registryEntries.length}</div>
              <div>Filtered: {filteredMappings.length}</div>
              <div>Selected: {selectedExercises.length}</div>
            </div>
            <div className="flex gap-1 mt-2">
              <button
                onClick={selectAllVisible}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Select All
              </button>
              <span className="text-gray-500">|</span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Mappings Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Exercise GIF Mappings & Approval Status</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedExercises.length === filteredMappings.filter(m => m.id).length && filteredMappings.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAllVisible();
                      } else {
                        clearSelection();
                      }
                    }}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Exercise Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Current GIF
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Mapping Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Approval Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredMappings.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-gray-700/50">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedExercises.includes(entry.id)}
                      onChange={() => toggleExerciseSelection(entry.id)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {entry.exerciseName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.matchType} match (confidence: {(entry.confidence * 100).toFixed(0)}%)
                    </div>
                    {entry.lastReviewedAt && (
                      <div className="text-xs text-gray-400">
                        Reviewed: {new Date(entry.lastReviewedAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-300">
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {entry.gifPath && entry.approvalStatus !== 'hidden' ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={entry.gifPath} 
                          alt={entry.exerciseName}
                          className="w-12 h-12 object-cover rounded border border-gray-600"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-exercise.jpg';
                          }}
                        />
                        <div className="text-xs text-gray-400">
                          <div>{entry.filename}</div>
                          {entry.fileSize && <div>{(entry.fileSize / 1024).toFixed(0)} KB</div>}
                        </div>
                      </div>
                    ) : entry.approvalStatus === 'hidden' ? (
                      <div className="text-gray-500 text-sm">
                        <span className="bg-red-900 text-red-300 px-2 py-1 rounded text-xs">GIF Hidden</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No GIF assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.gifPath 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {entry.gifPath ? '✅ Mapped' : '❌ Unmapped'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.approvalStatus === 'approved' ? 'bg-green-900 text-green-300' :
                        entry.approvalStatus === 'flagged' ? 'bg-yellow-900 text-yellow-300' :
                        entry.approvalStatus === 'hidden' ? 'bg-gray-900 text-gray-300' :
                        'bg-orange-900 text-orange-300'
                      }`}>
                        {entry.approvalStatus === 'approved' ? '✅ Approved' :
                         entry.approvalStatus === 'flagged' ? '🚩 Flagged' :
                         entry.approvalStatus === 'hidden' ? '👁️ Hidden' :
                         '⏳ Pending'}
                      </span>
                      {entry.flaggedReason && (
                        <div className="text-xs text-yellow-400" title={entry.flaggedReason}>
                          {entry.flaggedReason.substring(0, 20)}...
                        </div>
                      )}
                      {entry.reviewedBy && (
                        <div className="text-xs text-gray-500">
                          by {entry.reviewedBy}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {/* Quick approval actions */}
                      {entry.approvalStatus !== 'approved' && (
                        <button
                          onClick={() => updateApprovalStatus(entry.id, 'approved')}
                          className="text-green-400 hover:text-green-300 transition-colors text-xs px-2 py-1 bg-green-900/20 rounded"
                          title="Approve"
                        >
                          ✅
                        </button>
                      )}
                      
                      {entry.approvalStatus !== 'flagged' && (
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for flagging:');
                            if (reason) {
                              updateApprovalStatus(entry.id, 'flagged', reason);
                            }
                          }}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors text-xs px-2 py-1 bg-yellow-900/20 rounded"
                          title="Flag for review"
                        >
                          🚩
                        </button>
                      )}
                      
                      <button
                        onClick={() => updateApprovalStatus(entry.id, entry.approvalStatus === 'hidden' ? 'approved' : 'hidden')}
                        className="text-gray-400 hover:text-gray-300 transition-colors text-xs px-2 py-1 bg-gray-900/20 rounded"
                        title={entry.approvalStatus === 'hidden' ? 'Show GIF' : 'Hide GIF'}
                      >
                        {entry.approvalStatus === 'hidden' ? '👁️' : '🙈'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setEditingExercise(entry.exerciseName);
                          setShowGifSelector(true);
                        }}
                        className="text-purple-400 hover:text-purple-300 transition-colors text-xs px-2 py-1 bg-purple-900/20 rounded"
                        title="Change GIF assignment"
                      >
                        🎬
                      </button>
                      
                      {/* View match details button */}
                      <button
                        onClick={async () => {
                          try {
                            const details = await unifiedGifRegistry.getExerciseMatchDetails(entry.exerciseName);
                            alert(`Match Details for "${entry.exerciseName}":\n\nMatch Type: ${details.matchType}\nConfidence: ${(details.confidence * 100).toFixed(0)}%\nGIF Path: ${details.gifPath || 'None'}\nAlternatives: ${details.alternativeMatches?.length || 0} found`);
                          } catch (error) {
                            toast.error('Failed to get match details');
                          }
                        }}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors text-xs px-2 py-1 bg-cyan-900/20 rounded"
                        title="View matching details"
                      >
                        🔍
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredMappings.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No exercises match the current filters
            </div>
          )}
        </div>
      </div>

      {/* GIF Selector Modal */}
      {showGifSelector && editingExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Select GIF for "{editingExercise}"
              </h3>
              <button
                onClick={() => {
                  setShowGifSelector(false);
                  setEditingExercise(null);
                  setSelectedGif(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
              {filteredGifs.map((gif) => (
                <div
                  key={gif.path}
                  className={`cursor-pointer border-2 rounded-lg p-2 transition-all ${
                    selectedGif === gif.path
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => setSelectedGif(gif.path)}
                >
                  <img
                    src={gif.path}
                    alt={gif.name}
                    className="w-full h-20 object-cover rounded mb-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-exercise.jpg';
                    }}
                  />
                  <div className="text-xs text-gray-400 text-center">
                    <div className="truncate">{gif.name}</div>
                    <div>{gif.category}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowGifSelector(false);
                  setEditingExercise(null);
                  setSelectedGif(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (selectedGif && editingExercise) {
                    updateExerciseGif(editingExercise, selectedGif);
                  }
                }}
                disabled={!selectedGif}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign GIF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Upload Exercise GIFs
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                  setUploadError(null);
                  setUploadProgress({});
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Category Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibility</option>
                <option value="warmup">Warmup</option>
                <option value="sports">Sports</option>
                <option value="functional">Functional</option>
                <option value="rehabilitation">Rehabilitation</option>
              </select>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors"
            >
              <div className="text-4xl mb-4">🎬</div>
              <p className="text-gray-300 mb-2">
                Drag and drop GIF files here, or{' '}
                <label className="text-blue-400 hover:text-blue-300 cursor-pointer underline">
                  browse files
                  <input
                    type="file"
                    multiple
                    accept=".gif,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-400">
                Supports GIF files up to 10MB each
              </p>
            </div>

            {/* File List */}
            {uploadFiles.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Selected Files ({uploadFiles.length})
                </h4>
                <div className="space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700 rounded p-2">
                      <div className="flex-1">
                        <div className="text-sm text-white">{file.name}</div>
                        <div className="text-xs text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        {uploadProgress[file.name] && (
                          <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                            <div
                              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeUploadFile(index)}
                        className="text-red-400 hover:text-red-300 ml-2"
                        disabled={uploading}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && uploadProgress.overall && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress.overall}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.overall}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {uploadError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                {uploadError}
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                  setUploadError(null);
                  setUploadProgress({});
                }}
                disabled={uploading}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : `Upload ${uploadFiles.length} GIF${uploadFiles.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Details Modal */}
      {showEditModal && editingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Exercise Details
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDetails(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const name = formData.get('name') as string;
              const description = formData.get('description') as string;
              const category = formData.get('category') as string;
              
              if (editingDetails.id) {
                handleUpdateDetails(editingDetails.id, name, description, category);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Exercise Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={editingDetails.exerciseName}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={`Exercise with GIF: ${editingDetails.gifPath}`}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={editingDetails.category}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="warmup">Warmup</option>
                    <option value="sports">Sports</option>
                    <option value="functional">Functional</option>
                    <option value="rehabilitation">Rehabilitation</option>
                    <option value="core">Core</option>
                    <option value="legs">Legs</option>
                    <option value="push">Push</option>
                    <option value="pull">Pull</option>
                    <option value="fullbody">Full Body</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDetails(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};

export default ExerciseMediaPanel;