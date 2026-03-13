import React, { useState } from 'react';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import '../styles/Compiler.css';

const getFallbackLink = (language) => {
  switch (language) {
    case 'c':
      return 'https://www.onlinegdb.com/online_c_compiler';
    case 'cpp':
      return 'https://www.onlinegdb.com/online_c++_compiler';
    case 'java':
      return 'https://www.onlinegdb.com/online_java_compiler';
    case 'python':
      return 'https://www.onlinegdb.com/online_python_compiler';
    case 'javascript':
      return 'https://repl.it/languages/javascript';
    default:
      return 'https://www.onlinegdb.com/';
  }
};

const getLanguageName = (language) => {
  const map = {
    c: 'C',
    cpp: 'C++',
    java: 'Java',
    python: 'Python',
    javascript: 'JavaScript'
  };
  return map[language] || 'Language';
};

const Compiler = () => {
  const [language, setLanguage] = useState('c');

  const getIframeUrl = () => {
    switch (language) {
      case 'c':
      case 'cpp':
      case 'java':
      case 'python':
        return null;
      case 'javascript':
        return 'https://repl.it/languages/javascript';
      default:
        return null;
    }
  };


  return (
    <AuthenticatedPageLayout>
      <div className="compiler-page-container">

      <div className="compiler-header" style={{ marginTop: '2rem' }}>
        <h2>Interactive Compiler</h2>
        <p className="text-muted">Write, compile, and run your code instantly.</p>
      </div>

      <div className="compiler-layout">
        {/* Sidebar */}
        <div className="compiler-sidebar glass-card">
          <div className="compiler-controls">
            <label>
              Select Language
              <select className="compiler-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </label>
          </div>

          <div className="compiler-instructions">
            <h3>Instructions</h3>
            <p>Welcome to the embedded compiler environment. Select your desired programming language to get started.</p>
            <ul>
              <li>Write your code in the editor area.</li>
              <li>Use standard input for interactive programs.</li>
              <li>Click 'Run' to see your output.</li>
            </ul>
            <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>Note: Some languages require opening a new secure workspace directly on the compiler's platform.</p>
          </div>
        </div>

        {/* Main Editor */}
        <div className="compiler-main">
          <div className="editor-header">
            <div className="editor-title">
              <span style={{ color: 'var(--primary-color)' }}>&lt;/&gt;</span> {getLanguageName(language)} Editor
            </div>
            <div className="editor-status">
              <span className="status-dot"></span> Ready
            </div>
          </div>

          <div className="iframe-container">
            {getIframeUrl() ? (
              <iframe
                title="online-compiler"
                src={getIframeUrl()}
                sandbox="allow-scripts allow-same-origin allow-forms"
              ></iframe>
            ) : (
              <div className="iframe-blocked">
                <div className="blocked-icon">🛡️</div>
                <h3>Secure Workspace Required</h3>
                <p>
                  To compile <strong>{getLanguageName(language)}</strong>, our provider requires opening a secure sandbox environment in a new tab to ensure maximum stability and security for your code execution.
                </p>
                <a
                  href={getFallbackLink(language)}
                  target="_blank"
                  rel="noreferrer"
                  className="launch-btn"
                >
                  Launch {getLanguageName(language)} Workspace ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </AuthenticatedPageLayout>
  );
};

export default Compiler;