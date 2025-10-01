import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config/api';

/**
 * Custom hook for managing model warm-up functionality
 * Provides automatic background model warming and status tracking
 */
const useModelWarmup = (options = {}) => {
  const {
    autoWarmup = true,
    enableSmartWarmup = true,
    warmupOnMount = true,
    warmupOnModelSwitch = true
  } = options;

  // State
  const [warmupStatus, setWarmupStatus] = useState({
    isSystemWarming: false,
    activeWarmups: 0,
    warmModelCount: 0,
    models: {}
  });
  const [lastWarmupTime, setLastWarmupTime] = useState(null);
  const [warmupHistory, setWarmupHistory] = useState([]);

  // Refs for cleanup and debouncing
  const warmupTimeoutRef = useRef(null);
  const isComponentMountedRef = useRef(true);
  const statusPollingRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
      if (warmupTimeoutRef.current) {
        clearTimeout(warmupTimeoutRef.current);
      }
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
      }
    };
  }, []);

  /**
   * Get current warm-up status from backend
   */
  const getWarmupStatus = useCallback(async (modelName = null) => {
    try {
      const queryParam = modelName ? `?model=${encodeURIComponent(modelName)}` : '';
      const response = await fetch(`${API_BASE_URL}/api/ai-writing/warmup/status${queryParam}`);
      const data = await response.json();

      if (data.success && isComponentMountedRef.current) {
        if (modelName) {
          // Update status for specific model
          setWarmupStatus(prev => ({
            ...prev,
            models: {
              ...prev.models,
              [modelName]: data.data
            }
          }));
        } else {
          // Update overall status - backend returns { models: {...}, overallStatus: {...} }
          const overallStatus = data.data?.overallStatus || {};
          setWarmupStatus(prev => ({
            isSystemWarming: overallStatus.isSystemWarming ?? prev.isSystemWarming ?? false,
            activeWarmups: overallStatus.activeWarmups ?? prev.activeWarmups ?? 0,
            warmModelCount: overallStatus.warmModelCount ?? prev.warmModelCount ?? 0,
            models: data.data?.models ?? prev.models ?? {}
          }));
        }
        return data.data;
      }
    } catch (error) {
      console.warn('Failed to get warmup status:', error.message);
    }
    return null;
  }, []);

  /**
   * Warm up a specific model
   */
  const warmupModel = useCallback(async (modelName, priority = 'normal') => {
    if (!modelName) return { success: false, error: 'Model name required' };

    try {
      // Start polling status immediately to catch the warming state
      const statusPollingInterval = setInterval(() => {
        getWarmupStatus();
      }, 2000); // Poll every 2 seconds during warmup

      const response = await fetch(`${API_BASE_URL}/api/ai-writing/warmup/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, priority })
      });

      const data = await response.json();

      // Stop polling after warmup completes
      clearInterval(statusPollingInterval);

      if (data.success && isComponentMountedRef.current) {
        // Add to warmup history
        setWarmupHistory(prev => [...prev.slice(-9), {
          modelName,
          timestamp: new Date(),
          duration: data.data.duration,
          success: data.data.success
        }]);

        setLastWarmupTime(new Date());

        // Final status check after warmup
        setTimeout(() => getWarmupStatus(), 500);

        return data.data;
      }

      return data;
    } catch (error) {
      console.error('Error warming up model:', error);
      return { success: false, error: error.message };
    }
  }, [getWarmupStatus]);

  /**
   * Perform smart warmup based on context
   */
  const smartWarmup = useCallback(async (context = {}) => {
    if (!enableSmartWarmup) return { success: false, reason: 'Smart warmup disabled' };

    try {
      // Start polling status immediately to catch the warming state
      const statusPollingInterval = setInterval(() => {
        getWarmupStatus();
      }, 2000); // Poll every 2 seconds during warmup

      const response = await fetch(`${API_BASE_URL}/api/ai-writing/warmup/smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });

      const data = await response.json();

      // Stop polling after warmup completes
      clearInterval(statusPollingInterval);

      if (data.success && isComponentMountedRef.current) {
        setLastWarmupTime(new Date());

        // Add to history for each model that was warmed
        if (data.data && typeof data.data === 'object') {
          const historyEntries = Object.entries(data.data).map(([modelName, result]) => ({
            modelName,
            timestamp: new Date(),
            duration: result.duration || 0,
            success: result.success,
            isSmartWarmup: true
          }));

          setWarmupHistory(prev => [...prev.slice(-9 + historyEntries.length), ...historyEntries]);
        }

        // Final status check after warmup
        setTimeout(() => getWarmupStatus(), 500);

        return data.data;
      }

      return data;
    } catch (error) {
      console.error('Error performing smart warmup:', error);
      return { success: false, error: error.message };
    }
  }, [enableSmartWarmup, getWarmupStatus]);

  /**
   * Trigger warmup on page load
   */
  const triggerPageLoadWarmup = useCallback(async (context = {}) => {
    if (!autoWarmup) return;

    // Debounce rapid calls
    if (warmupTimeoutRef.current) {
      clearTimeout(warmupTimeoutRef.current);
    }

    warmupTimeoutRef.current = setTimeout(async () => {
      await smartWarmup({
        ...context,
        triggerType: 'page_load'
      });
    }, 1000); // 1 second delay to avoid overwhelming on rapid navigation
  }, [autoWarmup, smartWarmup]);

  /**
   * Trigger warmup on model switch
   */
  const triggerModelSwitchWarmup = useCallback(async (newModel, context = {}) => {
    if (!warmupOnModelSwitch || !newModel) return;

    await smartWarmup({
      ...context,
      triggerType: 'model_switch',
      recentlyUsed: [newModel]
    });
  }, [warmupOnModelSwitch, smartWarmup]);

  /**
   * Check if a specific model is warm
   */
  const isModelWarm = useCallback((modelName) => {
    if (!modelName) return false;
    const modelStatus = warmupStatus.models[modelName];
    return modelStatus?.isWarm === true;
  }, [warmupStatus.models]);

  /**
   * Check if a specific model is currently warming up
   */
  const isModelWarming = useCallback((modelName) => {
    if (!modelName) return false;
    const modelStatus = warmupStatus.models[modelName];
    return modelStatus?.isWarming === true;
  }, [warmupStatus.models]);

  /**
   * Get overall system status indicator
   */
  const getSystemStatus = useCallback(() => {
    const { isSystemWarming, warmModelCount, activeWarmups } = warmupStatus;

    if (isSystemWarming || activeWarmups > 0) {
      return { status: 'warming', color: 'orange', label: 'Warming up models...' };
    }

    if (warmModelCount > 0) {
      return { status: 'ready', color: 'green', label: `${warmModelCount} models ready` };
    }

    return { status: 'cold', color: 'red', label: 'Models need warming' };
  }, [warmupStatus]);

  /**
   * Start periodic status polling when system is warming
   */
  useEffect(() => {
    if (warmupStatus.isSystemWarming && !statusPollingRef.current) {
      statusPollingRef.current = setInterval(() => {
        getWarmupStatus();
      }, 2000); // Poll every 2 seconds when warming
    } else if (!warmupStatus.isSystemWarming && statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }

    return () => {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
    };
  }, [warmupStatus.isSystemWarming, getWarmupStatus]);

  /**
   * Initial warmup on component mount
   */
  useEffect(() => {
    if (warmupOnMount) {
      // Minimal delay for immediate warmup while not blocking initial render
      const initialWarmupTimeout = setTimeout(() => {
        triggerPageLoadWarmup({
          triggerType: 'session_start',
          userPreferences: [], // Can be populated from user settings
          projectModels: [],   // Can be populated from current project
          recentlyUsed: []     // Can be populated from localStorage/user history
        });
      }, 100); // Reduced from 2000ms to 100ms for faster initial warmup

      return () => clearTimeout(initialWarmupTimeout);
    }
  }, [warmupOnMount, triggerPageLoadWarmup]);

  return {
    // Status
    warmupStatus,
    lastWarmupTime,
    warmupHistory,

    // Actions
    warmupModel,
    smartWarmup,
    getWarmupStatus,
    triggerPageLoadWarmup,
    triggerModelSwitchWarmup,

    // Utilities
    isModelWarm,
    isModelWarming,
    getSystemStatus,

    // Computed values
    isSystemWarming: warmupStatus.isSystemWarming,
    warmModelCount: warmupStatus.warmModelCount,
    activeWarmups: warmupStatus.activeWarmups
  };
};

export default useModelWarmup;