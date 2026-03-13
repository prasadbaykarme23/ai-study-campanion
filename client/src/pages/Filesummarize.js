import React, { useState, useRef, useCallback, useEffect } from 'react';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import api, { summaryService } from '../services/api';
import { useMaterialStore } from '../context/store';
import { materialService } from '../services/api';
import { FaCloudUploadAlt, FaPlay, FaPause, FaStop, FaDownload, FaFileAlt } from 'react-icons/fa';
import { useSpeechSynthesis } from 'react-speech-kit';
import '../styles/FileSummarizer.css';

const SERVER_VOICE_MAP = {
  'Alloy (Neutral)': 'alloy',
  'Nova (Energetic)': 'nova',
  'Male': 'onyx',
  'Female': 'shimmer',
  'Natural': 'alloy',
};

// Tone profiles: ordered keyword/name fragments to try when matching browser voices
const BROWSER_VOICE_PROFILES = {
  'Alloy (Neutral)': ['google us english', 'microsoft mark', 'alex', 'english us', 'en-us', 'en_us'],
  'Nova (Energetic)': ['samantha', 'google uk english female', 'microsoft zira', 'karen', 'moira', 'female'],
  'Male':   ['male', 'microsoft david', 'microsoft mark', 'alex', 'daniel', 'fred', 'google uk english male'],
  'Female': ['female', 'microsoft zira', 'samantha', 'google us english', 'karen', 'moira', 'victoria'],
  'Natural': ['natural', 'enhanced', 'premium', 'google', 'en-'],
};

function matchBrowserVoice(profileName, availableVoices) {
  if (!availableVoices || availableVoices.length === 0) return null;
  const keywords = BROWSER_VOICE_PROFILES[profileName] || [];
  for (const kw of keywords) {
    const hit = availableVoices.find(v => v.name.toLowerCase().includes(kw.toLowerCase()) || v.lang.toLowerCase().includes(kw.toLowerCase()));
    if (hit) return hit;
  }
  // fallback: first English voice
  return availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0] || null;
}

const FileSummarizer = () => {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCooldown, setPreviewCooldown] = useState(0);
  const previewRef = useRef(null);
  const previewCache = useRef({});
  const [fileUrl, setFileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Nova (Energetic)');
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewCooldownIntervalRef = useRef(null);
  const { materials, setMaterials } = useMaterialStore();

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
  
  // Client-side speech synthesis
  const { speak, cancel, speaking } = useSpeechSynthesis();
  const [availableVoices, setAvailableVoices] = useState([]);

  // Load available voices for client-side synthesis
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices || []);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleSpeakSummary = useCallback(() => {
    if (!summary) return;
    
    const utteranceOptions = {
      pitch: 1,
      rate: 1,
    };

    const matched = matchBrowserVoice(selectedVoice, availableVoices);
    if (matched) utteranceOptions.voice = matched;

    if (speaking) {
      cancel();
    } else {
      speak({ text: summary, ...utteranceOptions });
    }
  }, [summary, selectedVoice, availableVoices, speak, cancel, speaking]);

  const handleStopSpeech = useCallback(() => {
    cancel();
  }, [cancel]);

  const startPreviewCooldown = useCallback((seconds = 3) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);

    if (previewCooldownIntervalRef.current) {
      clearInterval(previewCooldownIntervalRef.current);
      previewCooldownIntervalRef.current = null;
    }

    if (safeSeconds === 0) {
      setPreviewCooldown(0);
      return;
    }

    setPreviewCooldown(safeSeconds);
    previewCooldownIntervalRef.current = setInterval(() => {
      setPreviewCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(previewCooldownIntervalRef.current);
          previewCooldownIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (previewCooldownIntervalRef.current) {
        clearInterval(previewCooldownIntervalRef.current);
      }
    };
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) validateAndSetFile(selectedFile);
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
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('voice', SERVER_VOICE_MAP[selectedVoice] || 'alloy');
    try {
      console.log('Uploading file for summarization...');
      const response = await summaryService.uploadFile(formData);
      console.log('File processed successfully:', response.data);
      setSummary(response.data.summary);
      if (response.data.audioUrl) {
        setAudioUrl(response.data.audioUrl.startsWith('http') ? response.data.audioUrl : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${response.data.audioUrl}`);
      } else {
        setAudioUrl('');
      }
      setFileUrl(response.data.fileUrl || '');

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

  const handlePreviewVoice = useCallback(async () => {
    if (!selectedVoice || previewLoading || previewCooldown > 0) return;
    
    // Check cache first - if we have it, use cached version immediately
    if (previewCache.current[selectedVoice]) {
      console.log(`✅ Using cached preview for voice: ${selectedVoice}`);
      setError(''); // Clear any previous errors
      setPreviewUrl(previewCache.current[selectedVoice]);
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.load();
          previewRef.current.play();
        }
      }, 100);
      return;
    }

    setPreviewLoading(true);
    setPreviewUrl('');
    setError('');
    let customCooldownApplied = false;
    
    try {
      const serverVoice = SERVER_VOICE_MAP[selectedVoice] || 'alloy';
      console.log(`🎤 Requesting NEW voice preview for: ${selectedVoice} (server: ${serverVoice})`);
      console.log(`📊 Cache status:`, Object.keys(previewCache.current).length, 'voices cached');
      const response = await api.post('/tts/sample', { voice: serverVoice, text: `This is a preview of the ${selectedVoice} voice.` });
      console.log('✅ Voice preview generated successfully');
      const audioUrl = response.data.audioUrl;
      
      // Cache the preview URL
      previewCache.current[selectedVoice] = audioUrl;
      console.log(`💾 Cached preview for ${selectedVoice}`);
      
      setPreviewUrl(audioUrl);
      setTimeout(() => previewRef.current?.play?.(), 200);
    } catch (err) {
      console.error('Preview error:', err);
      if (err.response?.status === 429) {
        const retryAfterSeconds =
          Number(err.response?.data?.retryAfterSeconds) ||
          Number(err.response?.data?.error?.details?.retryAfterSeconds) ||
          Number(err.response?.headers?.['retry-after']) ||
          0;

        if (retryAfterSeconds > 0) {
          setError(`Too many preview requests. Please wait ${retryAfterSeconds} second(s) and try again.`);
          startPreviewCooldown(Math.max(3, Math.min(60, retryAfterSeconds)));
          customCooldownApplied = true;
        } else {
          setError('Too many preview requests. Please wait a few seconds and try again.');
        }
      } else if (err.response?.status === 401) {
        setError('Voice preview is unavailable: OpenAI API key is invalid or expired.');
      } else if (err.response?.status === 403) {
        setError('Voice preview is unavailable: OpenAI billing or permissions need to be updated.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Invalid voice preview request.');
      } else {
        const msg = err.response?.data?.message || 'Could not generate voice preview';
        setError(msg);
      }
    } finally {
      setPreviewLoading(false);
      if (!customCooldownApplied) {
        startPreviewCooldown(3);
      }
    }
  }, [selectedVoice, previewLoading, previewCooldown, startPreviewCooldown]);

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
    <AuthenticatedPageLayout>
      <div className="file-summarizer-container">

      <div className="summarizer-header" style={{ marginTop: '2rem' }}>
        <h2>AI Study Summarizer</h2>
        <p className="text-muted">Upload your study material to generate text and audio summaries.</p>
      </div>

      <div
        className="upload-card-premium"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current.click()}
      >
        <div className="upload-icon-wrapper">
          <FaCloudUploadAlt />
        </div>
        <div className="upload-title">{file ? 'Select a different file' : 'Click or drag file to this area to upload'}</div>
        <p className="file-types-muted">Support for a single or bulk upload. Strictly PDF, TXT, DOCX formats (max 10MB).</p>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.txt,.docx" style={{ display: 'none' }} />
      </div>

      {file && (
        <>
          <div className="uploaded-files-card glass-card">
            <h3 className="section-title-sm" style={{ marginBottom: 0 }}>Selected File</h3>
            <div className="file-item-premium">
              <div className="file-name-group">
                <FaFileAlt className="file-icon" style={{ color: 'var(--primary-color)' }} />
                <span className="file-name-text">{file.name}</span>
              </div>
            </div>
          </div>

          <div className="processing-options-card glass-card">
            <h3 className="section-title-sm">Processing Options</h3>
            <div className="options-row">
              <div className="voice-select-group">
                <label>Audio Voice Persona</label>
                <select className="premium-select" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                  <option value="Alloy (Neutral)">Alloy (Neutral)</option>
                  <option value="Nova (Energetic)">Nova (Energetic)</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Natural">Natural</option>
                </select>
              </div>

              <div className="action-buttons-group">
                <button 
                  onClick={handlePreviewVoice} 
                  disabled={previewLoading || isLoading || previewCooldown > 0} 
                  className="btn btn-secondary"
                  title={
                    previewCooldown > 0 
                      ? `Wait ${previewCooldown}s before next preview` 
                      : previewCache.current[selectedVoice]
                      ? `Play cached ${selectedVoice} preview (no API call)`
                      : `Generate and play ${selectedVoice} voice preview`
                  }
                >
                  {previewLoading 
                    ? 'Loading Preview...' 
                    : previewCooldown > 0 
                    ? `Wait ${previewCooldown}s` 
                    : previewCache.current[selectedVoice]
                    ? '▶️ Play Preview'
                    : '🎤 Preview Voice'}
                </button>
                <button onClick={handleUpload} disabled={isLoading} className="btn btn-primary">
                  {isLoading ? 'Processing...' : 'Summarize File'}
                </button>
              </div>
            </div>
            {previewUrl && (
              <div style={{ marginTop: '1.5rem' }}>
                <audio ref={previewRef} src={previewUrl} controls style={{ width: '100%' }} />
              </div>
            )}
          </div>
        </>
      )}

      {isLoading && (
        <div className="processing-state glass-card">
          <div className="premium-spinner"></div>
          <p>Extracting text, analyzing content, and generating audio summary...</p>
        </div>
      )}

      {error && <div className="text-center" style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '2rem' }}>{error}</div>}

      {(summary || audioUrl) && (
        <div className="results-grid">
          {summary && (
            <div className="result-card glass-card">
              <h3>📄 Generated Summary</h3>
              <div className="summary-text">{summary}</div>
              
              <div className="voice-playback-section" style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '16px', fontWeight: '600' }}>🔊 Voice Playback</h4>
                
                <div className="voice-select-wrapper" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--text-secondary)' }}>Select Voice</label>
                  <select 
                    className="premium-select" 
                    value={selectedVoice} 
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Alloy (Neutral)">Alloy (Neutral)</option>
                    <option value="Nova (Energetic)">Nova (Energetic)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Natural">Natural</option>
                  </select>
                </div>

                <div className="voice-controls" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handleSpeakSummary}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {speaking ? <FaPause /> : <FaPlay />}
                    {speaking ? 'Pause Reading' : 'Read Aloud'}
                  </button>
                  
                  <button 
                    onClick={handleStopSpeech}
                    className="btn btn-secondary"
                    disabled={!speaking}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FaStop /> Stop
                  </button>
                </div>
              </div>
            </div>
          )}

          {audioUrl && (
            <div className="result-card glass-card text-center">
              <h3>🎵 Audio Summary (Server-Generated)</h3>
              <div className="audio-player-wrapper">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  controls
                  style={{ width: '100%', marginBottom: '1rem' }}
                />

                <div className="audio-controls-premium">
                  <button className="control-btn" onClick={togglePlayback} title={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                  <button className="control-btn secondary" onClick={downloadAudio} title="Download Audio">
                    <FaDownload />
                  </button>
                </div>
              </div>
            </div>
          )}

          {fileUrl && (
            <div className="text-center" style={{ marginTop: '1rem' }}>
              <button type="button" onClick={handleOpenUploadedDocument} className="file-link-btn">
                <FaFileAlt /> Open Original Uploaded Document
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </AuthenticatedPageLayout>
  );
};

export default FileSummarizer;