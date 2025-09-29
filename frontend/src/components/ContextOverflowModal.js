import React, { useState, useEffect } from 'react';

const ContextOverflowModal = ({
  isOpen,
  onClose,
  overflowAnalysis,
  onConfirmSelection,
  loading = false
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [currentTokens, setCurrentTokens] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // priority, relevance, name, tokens

  // Initialize with recommended documents
  useEffect(() => {
    if (overflowAnalysis?.recommendations?.suggestedDocuments) {
      const recommended = new Set(overflowAnalysis.recommendations.suggestedDocuments);
      setSelectedDocuments(recommended);

      // Calculate initial token count
      const initialTokens = overflowAnalysis.documentBreakdown
        .filter(doc => recommended.has(doc.id))
        .reduce((sum, doc) => sum + doc.tokenCount, 0);
      setCurrentTokens(initialTokens);
    }
  }, [overflowAnalysis]);

  if (!isOpen || !overflowAnalysis) return null;

  const handleDocumentToggle = (documentId, tokenCount) => {
    const newSelected = new Set(selectedDocuments);
    let newTokenCount = currentTokens;

    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
      newTokenCount -= tokenCount;
    } else {
      newSelected.add(documentId);
      newTokenCount += tokenCount;
    }

    setSelectedDocuments(newSelected);
    setCurrentTokens(newTokenCount);
  };

  const handleSelectAll = () => {
    const allIds = new Set(overflowAnalysis.documentBreakdown.map(doc => doc.id));
    const allTokens = overflowAnalysis.documentBreakdown.reduce((sum, doc) => sum + doc.tokenCount, 0);
    setSelectedDocuments(allIds);
    setCurrentTokens(allTokens);
  };

  const handleSelectRecommended = () => {
    const recommended = new Set(overflowAnalysis.recommendations.suggestedDocuments);
    const recommendedTokens = overflowAnalysis.documentBreakdown
      .filter(doc => recommended.has(doc.id))
      .reduce((sum, doc) => sum + doc.tokenCount, 0);
    setSelectedDocuments(recommended);
    setCurrentTokens(recommendedTokens);
  };

  const handleClearAll = () => {
    setSelectedDocuments(new Set());
    setCurrentTokens(0);
  };

  const handleConfirm = () => {
    onConfirmSelection(Array.from(selectedDocuments));
  };

  // Filter and sort documents
  const filteredDocuments = overflowAnalysis.documentBreakdown
    .filter(doc =>
      doc.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchFilter.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return a.priorityScore - b.priorityScore;
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'tokens':
          return b.tokenCount - a.tokenCount;
        default:
          return 0;
      }
    });

  const isWithinLimit = currentTokens <= overflowAnalysis.maxContextTokens;
  const tokenUsagePercent = (currentTokens / overflowAnalysis.maxContextTokens) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              🚨 Context Overflow Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select documents to stay within token limits
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Token Usage Summary */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Token Usage: {currentTokens.toLocaleString()} / {overflowAnalysis.maxContextTokens.toLocaleString()}
            </span>
            <span className={`text-sm font-medium ${isWithinLimit ? 'text-green-600' : 'text-red-600'}`}>
              {isWithinLimit ? '✅ Within Limit' : `🚨 ${(currentTokens - overflowAnalysis.maxContextTokens).toLocaleString()} Over`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isWithinLimit ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, tokenUsagePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>0</span>
            <span>{tokenUsagePercent.toFixed(1)}% used</span>
            <span>{overflowAnalysis.maxContextTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button
              onClick={handleSelectRecommended}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              disabled={loading}
            >
              📝 Use Recommended ({overflowAnalysis.recommendations.suggestedDocuments.length})
            </button>
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              ☑️ Select All
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
              disabled={loading}
            >
              ❌ Clear All
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="🔍 Filter documents..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="priority">Sort by Priority</option>
              <option value="relevance">Sort by Relevance</option>
              <option value="name">Sort by Name</option>
              <option value="tokens">Sort by Token Count</option>
            </select>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredDocuments.map((doc) => {
              const isSelected = selectedDocuments.has(doc.id);
              const isRecommended = overflowAnalysis.recommendations.suggestedDocuments.includes(doc.id);

              return (
                <div
                  key={doc.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !loading && handleDocumentToggle(doc.id, doc.tokenCount)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div click
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={loading}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </h4>
                          {isRecommended && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              ⭐ Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Category: {doc.category} • Priority: {doc.priorityScore.toFixed(1)} •
                          Relevance: {doc.relevanceScore}%
                        </p>
                        {doc.sections && doc.sections.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.sections.slice(0, 3).map((section, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {section.type}
                              </span>
                            ))}
                            {doc.sections.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{doc.sections.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600 ml-3">
                      <div className="font-medium">{doc.tokenCount.toLocaleString()} tokens</div>
                      <div className="text-xs">{doc.chunkCount || 0} chunks</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No documents match your search criteria.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedDocuments.size} of {overflowAnalysis.documentBreakdown.length} documents selected
              <br />
              <span className={isWithinLimit ? 'text-green-600' : 'text-red-600'}>
                {overflowAnalysis.recommendations.priorityMessage}
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedDocuments.size === 0 || !isWithinLimit || loading}
                className={`px-4 py-2 rounded font-medium transition-all duration-200 ${
                  selectedDocuments.size === 0 || !isWithinLimit || loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 transform hover:scale-105'
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying Selection...
                  </span>
                ) : (
                  `✅ Apply Selection (${currentTokens.toLocaleString()} tokens)`
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ContextOverflowModal;