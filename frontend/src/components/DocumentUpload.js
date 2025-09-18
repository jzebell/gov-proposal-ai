import React, { useState } from 'react';

const DocumentUpload = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [error, setError] = useState(null);

    const handleFileSelect = (event) => {
        setSelectedFile(event.target.files[0]);
        setError(null);
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append('document', selectedFile);

        try {
            const response = await fetch('http://localhost:3001/api/analysis/solicitation', {
                method: 'POST',
                body: formData,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                },
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            setAnalysisResults(result);
            setUploadProgress(0);
            setError(null);
        } catch (err) {
            setError(err.message);
            setUploadProgress(0);
        }
    };

    return (
        <div className="document-upload">
            <h2>Document Analysis Upload</h2>
            <form onSubmit={handleUpload}>
                <div className="file-input">
                    <input
                        type="file"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.txt"
                    />
                </div>

                {uploadProgress > 0 && (
                    <div className="progress">
                        <div 
                            className="progress-bar" 
                            style={{ width: `${uploadProgress}%` }}
                        >
                            {uploadProgress}%
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={!selectedFile || uploadProgress > 0}
                >
                    Upload and Analyze
                </button>
            </form>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {analysisResults && (
                <div className="analysis-results">
                    <h3>Analysis Results:</h3>
                    <pre>{JSON.stringify(analysisResults, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default DocumentUpload;