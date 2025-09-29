import React, { useState, useEffect, useCallback } from 'react';

const AnalyticsDashboard = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001'
}) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(24);
  const [selectedProject, setSelectedProject] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams({
        timeRange: selectedTimeRange.toString(),
        includeRealtime: 'true'
      });

      if (selectedProject) {
        params.append('projectName', selectedProject);
      }

      const response = await fetch(`${apiUrl}/api/analytics/dashboard?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
        setRealTimeMetrics(result.data.realtime);
      } else {
        setError(result.message || 'Failed to load analytics data');
      }

    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, selectedProject, apiUrl]);

  // Load real-time metrics
  const loadRealTimeMetrics = useCallback(async () => {
    if (!autoRefresh) return;

    try {
      const response = await fetch(`${apiUrl}/api/analytics/realtime`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRealTimeMetrics(result.data);
        }
      }
    } catch (err) {
      // Silently fail for real-time updates
      console.warn('Real-time metrics update failed:', err.message);
    }
  }, [autoRefresh, apiUrl]);

  // Initial load
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Auto-refresh real-time metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadRealTimeMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadRealTimeMetrics]);

  // Time range options
  const timeRangeOptions = [
    { value: 1, label: '1 Hour' },
    { value: 6, label: '6 Hours' },
    { value: 24, label: '24 Hours' },
    { value: 72, label: '3 Days' },
    { value: 168, label: '1 Week' }
  ];

  // Export analytics data
  const handleExport = async (format = 'json') => {
    try {
      const response = await fetch(`${apiUrl}/api/analytics/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          timeRange: selectedTimeRange,
          projectName: selectedProject || null,
          includeRawData: true
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Create downloadable file
        const blob = new Blob([JSON.stringify(result.data, null, 2)],
          { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className={`analytics-dashboard ${className}`} style={{
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading analytics dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`analytics-dashboard ${className}`} style={{
        padding: '20px',
        textAlign: 'center',
        color: '#dc2626'
      }}>
        <p>❌ {error}</p>
        <button
          onClick={loadAnalytics}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`analytics-dashboard ${className}`} style={{ padding: '20px' }}>
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${className}`} style={{
      padding: '20px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '16px 20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            📊 Performance Analytics
          </h1>
          <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
            Context Management System Performance Dashboard
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(parseInt(e.target.value))}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Project Filter */}
          <input
            type="text"
            placeholder="Filter by project..."
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px'
            }}
          />

          {/* Export Button */}
          <button
            onClick={() => handleExport('json')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            📥 Export
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadAnalytics}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Real-time Status Bar */}
      {realTimeMetrics && (
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          padding: '12px 16px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#065f46' }}>
              System Health: {realTimeMetrics.systemHealth}
            </span>
          </div>

          <span style={{ fontSize: '12px', color: '#065f46' }}>
            Active Builds: {realTimeMetrics.activeBuilds}
          </span>

          <span style={{ fontSize: '12px', color: '#065f46' }}>
            Citations: {realTimeMetrics.activeCitations}
          </span>

          <span style={{ fontSize: '12px', color: '#065f46' }}>
            Load: {realTimeMetrics.currentLoadAverage}%
          </span>

          <span style={{ fontSize: '12px', color: '#065f46', marginLeft: 'auto' }}>
            Last Updated: {new Date(realTimeMetrics.lastUpdateTime).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        backgroundColor: 'white',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        {[
          { id: 'overview', label: '📈 Overview', icon: '📈' },
          { id: 'performance', label: '⚡ Performance', icon: '⚡' },
          { id: 'citations', label: '🔗 Citations', icon: '🔗' },
          { id: 'users', label: '👥 Users', icon: '👥' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0 0 8px 8px',
        padding: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              System Overview
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Key Metrics Cards */}
              <MetricCard
                title="Context Builds"
                value={analytics.systemOverview.totalContextBuilds}
                subtitle={`${analytics.systemOverview.successRate}% success rate`}
                color="#3b82f6"
                icon="🔧"
              />

              <MetricCard
                title="Citations"
                value={analytics.systemOverview.totalCitationAccesses}
                subtitle={`${analytics.systemOverview.uniqueDocumentsAccessed} unique docs`}
                color="#10b981"
                icon="🔗"
              />

              <MetricCard
                title="Avg Build Time"
                value={`${analytics.systemOverview.averageBuildTime}ms`}
                subtitle="Processing speed"
                color="#f59e0b"
                icon="⏱️"
              />

              <MetricCard
                title="Cache Hit Rate"
                value={`${analytics.systemOverview.cacheHitRate}%`}
                subtitle="Performance optimization"
                color="#8b5cf6"
                icon="💾"
              />

              <MetricCard
                title="Tokens Processed"
                value={analytics.systemOverview.totalTokensProcessed.toLocaleString()}
                subtitle="Total content processed"
                color="#ec4899"
                icon="📝"
              />

              <MetricCard
                title="Overflow Events"
                value={analytics.systemOverview.overflowEvents}
                subtitle={`${analytics.systemOverview.averageOverflowAmount} avg excess`}
                color="#ef4444"
                icon="⚠️"
              />
            </div>

            {/* Trends */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                Performance Trends
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <TrendCard
                  title="Build Performance"
                  trend={analytics.trends.trend}
                  description="Overall system performance trend"
                />
                <TrendCard
                  title="Build Volume"
                  trend={analytics.trends.buildVolumeTrend}
                  description="Number of builds over time"
                />
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              Context Build Performance
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <PerformanceCard
                title="Build Statistics"
                metrics={[
                  { label: 'Total Builds', value: analytics.contextPerformance.totalBuilds },
                  { label: 'Average Duration', value: `${analytics.contextPerformance.averageDuration}ms` },
                  { label: 'Median Duration', value: `${analytics.contextPerformance.medianDuration}ms` },
                  { label: '95th Percentile', value: `${analytics.contextPerformance.p95Duration}ms` }
                ]}
                color="#3b82f6"
              />

              <PerformanceCard
                title="Token Processing"
                metrics={[
                  { label: 'Average Tokens', value: analytics.contextPerformance.averageTokens },
                  { label: 'Max Tokens', value: analytics.contextPerformance.maxTokens },
                  { label: 'Error Rate', value: `${analytics.contextPerformance.errorRate}%` }
                ]}
                color="#10b981"
              />

              <PerformanceCard
                title="Build Classification"
                metrics={[
                  { label: 'Fast Builds (<1s)', value: analytics.contextPerformance.fastBuilds },
                  { label: 'Slow Builds (>10s)', value: analytics.contextPerformance.slowBuilds },
                  { label: 'Failed Builds', value: analytics.systemOverview.failedBuilds }
                ]}
                color="#f59e0b"
              />
            </div>

            {/* Performance by Document Type */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                Performance by Document Type
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {analytics.contextPerformance.performanceByDocumentType.map((type, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                      {type.type}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      <div>Builds: {type.count}</div>
                      <div>Avg: {Math.round(type.averageDuration)}ms</div>
                      <div>Success: {type.successRate.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Citations Tab */}
        {activeTab === 'citations' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              Citation Analytics
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <MetricCard
                title="Total Accesses"
                value={analytics.citationAnalytics.totalAccesses}
                subtitle="Citation interactions"
                color="#10b981"
                icon="👆"
              />

              <MetricCard
                title="Unique Users"
                value={analytics.citationAnalytics.uniqueUsers}
                subtitle="Active researchers"
                color="#3b82f6"
                icon="👥"
              />

              <MetricCard
                title="Unique Documents"
                value={analytics.citationAnalytics.uniqueDocuments}
                subtitle="Documents accessed"
                color="#f59e0b"
                icon="📄"
              />

              <MetricCard
                title="Bounce Rate"
                value={`${analytics.citationAnalytics.bounceRate.toFixed(1)}%`}
                subtitle="Single interaction sessions"
                color="#ef4444"
                icon="↩️"
              />
            </div>

            {/* Access Type Breakdown */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                Access Type Breakdown
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {analytics.citationAnalytics.accessTypeBreakdown.map((type, index) => (
                  <div key={index} style={{
                    padding: '12px 16px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
                      {type.count}
                    </div>
                    <div style={{ fontSize: '12px', color: '#075985', textTransform: 'capitalize' }}>
                      {type.type} ({type.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Accessed Documents */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                Most Accessed Documents
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {analytics.citationAnalytics.mostAccessedDocuments.slice(0, 5).map((doc, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#1f2937' }}>
                      Document {doc.documentId}
                    </span>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                      <span>{doc.accessCount} accesses</span>
                      <span>{doc.uniqueUsers} users</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              User Engagement
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <MetricCard
                title="Active Users"
                value={analytics.userEngagement.activeUsers}
                subtitle="In selected time range"
                color="#3b82f6"
                icon="👤"
              />

              <MetricCard
                title="Active Projects"
                value={analytics.userEngagement.activeProjects}
                subtitle="Projects with activity"
                color="#10b981"
                icon="📁"
              />

              <MetricCard
                title="Avg Interactions"
                value={analytics.userEngagement.averageInteractionsPerUser.toFixed(1)}
                subtitle="Per user"
                color="#f59e0b"
                icon="🔄"
              />

              <MetricCard
                title="Return Users"
                value={`${analytics.userEngagement.returnUserRate.toFixed(1)}%`}
                subtitle="Users with >1 session"
                color="#8b5cf6"
                icon="🔁"
              />
            </div>

            {/* Feature Adoption */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                Feature Adoption
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {Object.entries(analytics.userEngagement.featureAdoption).map(([feature, count]) => (
                  <div key={feature} style={{
                    padding: '12px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#065f46' }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '12px', color: '#16a34a', textTransform: 'capitalize' }}>
                      {feature.replace(/([A-Z])/g, ' $1')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, color, icon }) => (
  <div style={{
    padding: '16px',
    backgroundColor: 'white',
    border: `2px solid ${color}`,
    borderRadius: '8px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontSize: '24px', fontWeight: '700', color, marginBottom: '4px' }}>
      {value}
    </div>
    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
      {title}
    </div>
    <div style={{ fontSize: '12px', color: '#6b7280' }}>
      {subtitle}
    </div>
  </div>
);

// Performance Card Component
const PerformanceCard = ({ title, metrics, color }) => (
  <div style={{
    padding: '16px',
    backgroundColor: 'white',
    border: `1px solid ${color}`,
    borderRadius: '8px'
  }}>
    <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color }}>
      {title}
    </h5>
    <div style={{ display: 'grid', gap: '8px' }}>
      {metrics.map((metric, index) => (
        <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{metric.label}:</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>{metric.value}</span>
        </div>
      ))}
    </div>
  </div>
);

// Trend Card Component
const TrendCard = ({ title, trend, description }) => (
  <div style={{
    padding: '16px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
      <h5 style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
        {title}
      </h5>
      <span style={{
        fontSize: '18px',
        color: trend === 'increasing' ? '#10b981' : trend === 'decreasing' ? '#ef4444' : '#6b7280'
      }}>
        {trend === 'increasing' ? '📈' : trend === 'decreasing' ? '📉' : '📊'}
      </span>
    </div>
    <div style={{ fontSize: '12px', color: '#6b7280' }}>
      {description}
    </div>
    <div style={{
      fontSize: '12px',
      fontWeight: '600',
      color: trend === 'increasing' ? '#10b981' : trend === 'decreasing' ? '#ef4444' : '#6b7280',
      textTransform: 'capitalize',
      marginTop: '8px'
    }}>
      {trend}
    </div>
  </div>
);

export default AnalyticsDashboard;