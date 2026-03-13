import React, { useState, useRef, useCallback } from 'react';
import api, { summaryService } from '../services/api';
import { materialService } from '../services/api';
import { useMaterialStore } from '../context/store';
import { FaCloudUploadAlt, FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import '../styles/FileSummarizer.css';

const FileSummarizer = () => {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioReady, setAudioReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRef = useRef(null);
  const [fileUrl, setFileUrl] = useState('');
  const { materials, setMaterials } = useMaterialStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [voice, setVoice] = useState('alloy');
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const lastPreviewTimeRef = useRef(0);

  const getUploadedFileUrl = useCallback((uploadedFileUrl) => {
    if (!uploadedFileUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(uploadedFileUrl)) {
      return uploadedFileUrl;
    }

    const apiOrigin = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    return `${apiOrigin}${uploadedFileUrl.startsWith('/') ? uploadedFileUrl : `/${uploadedFileUrl}`}`;
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Unsupported file type. Please upload PDF, TXT, or DOCX files.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size too large. Maximum 10MB allowed.');
      return;
    }
    setFile(selectedFile);
    setError('');
    setSummary('');
    setAudioUrl('');
    setAudioReady(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('voice', voice);

    try {
        console.log('Uploading file for summarization...');
      const response = await summaryService.uploadFile(formData);
        console.log('File processed successfully:', response.data);

      setSummary(response.data.summary);
      // Accept absolute or relative audioUrl from server
      if (response.data.audioUrl) {
        setAudioUrl(response.data.audioUrl.startsWith('http') ? response.data.audioUrl : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${response.data.audioUrl}`);
      } else {
        setAudioUrl('');
      }
      setFileUrl(response.data.fileUrl || '');
      // Update materials store if server created a material
      if (response.data.material) {
        const existing = materials || [];
        setMaterials([response.data.material, ...existing]);
      } else {
        if (sessionStorage.getItem('token')) {
          try {
            const md = new FormData();
            md.append('title', file.name);
            md.append('file', file);
            await materialService.uploadMaterial(md);
          } catch (mErr) {
            console.warn('Fallback material upload failed:', mErr);
          }
        }
      }
      setAudioReady(false);
      // Do not autoplay after upload. User can select voice without hearing it.
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing file');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const playFileAudio = () => {
    if (!audioUrl || !audioRef.current || !audioReady) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handlePreviewVoice = useCallback(async () => {
    if (!voice || previewLoading) return;
    
    // Throttle: Prevent requests within 2 seconds of last request
    const now = Date.now();
    const timeSinceLastPreview = now - lastPreviewTimeRef.current;
    if (timeSinceLastPreview < 2000) {
      setError(`Please wait ${Math.ceil((2000 - timeSinceLastPreview) / 1000)} second(s) before requesting another preview.`);
      return;
    }
    
    // Clear any pending timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    lastPreviewTimeRef.current = now;
    setPreviewLoading(true);
    setPreviewUrl('');
    setError('');
    
    try {
      console.log(`Requesting voice preview for: ${voice}`);
      const response = await api.post('/tts/sample', { voice, text: `Preview for voice ${voice}` });
      console.log('Voice preview generated successfully');
      setPreviewUrl(response.data.audioUrl);
      // play automatically
      setTimeout(() => previewRef.current?.play?.(), 200);
    } catch (err) {
      console.error('Preview error:', err);
      if (err.response?.status === 429) {
        setError('Too many preview requests. Wait 30 seconds and try again.');
      } else if (err.response?.status === 401) {
        setError('Voice preview is unavailable: Voice API key is invalid or expired.');
      } else if (err.response?.status === 403) {
        setError('Voice preview is unavailable: Provider billing or permissions need to be updated.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Invalid voice preview request.');
      } else {
        const msg = err.response?.data?.message || 'Could not generate voice preview';
        setError(msg);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [voice, previewLoading]);

  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'summary.mp3';
    link.click();
  };

  const handleOpenUploadedDocument = useCallback(() => {
    const uploadedFileUrl = getUploadedFileUrl(fileUrl);
    if (!uploadedFileUrl) {
      return;
    }

    window.open(uploadedFileUrl, '_blank', 'noopener,noreferrer');
  }, [fileUrl, getUploadedFileUrl]);

  return (
    <div className="file-summarizer">
      <h2>Summary Section</h2>

      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current.click()}
      >
        <FaCloudUploadAlt className="upload-icon" />
        <p>{file ? file.name : 'Drag & drop a file here or click to select'}</p>
        <p className="file-types">Supported: PDF, TXT, DOCX (max 10MB)</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.txt,.docx"
          style={{ display: 'none' }}
        />
      </div>

      {file && (
        <div className="uploaded-files-list">
          <strong>Upload</strong>
          <div className="uploaded-file-item">
            <span className="uploaded-file-name">{file.name}</span>
            <div className="file-actions">
              <button 
                onClick={handlePreviewVoice} 
                disabled={previewLoading || isLoading} 
                className="preview-btn"
                title="Preview the selected voice (max 1 request per 2 seconds)"
              >
                {previewLoading ? 'Generating...' : 'Preview Voice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="upload-options">
          <label>
            Voice:
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </label>
          <button onClick={handleUpload} disabled={isLoading} className="upload-btn">
            {isLoading ? 'Processing...' : 'Upload & Summarize'}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Extracting text, generating summary, and creating audio...</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {summary && (
        <div className="summary-section">
          <h3>Summary</h3>
          <p>{summary}</p>
        </div>
      )}
      {fileUrl && (
        <div className="file-link">
          <button type="button" className="file-link-btn" onClick={handleOpenUploadedDocument}>Open uploaded file</button>
        </div>
      )}

      {audioUrl && (
        <div className="audio-section">
          <h3>Audio Summary</h3>
          {previewUrl && (
            <audio ref={previewRef} src={previewUrl} onEnded={() => {}} />
          )}
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onCanPlay={() => setAudioReady(true)}
          />
          <div className="audio-controls">
            <button onClick={togglePlayback}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button onClick={downloadAudio}>
              <FaDownload />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileSummarizer;