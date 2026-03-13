import React from 'react';

const linkTokenRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;

const renderLineWithLinks = (line, lineIndex) => {
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkTokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    const markdownLabel = match[1];
    const markdownUrl = match[2];
    const bareUrl = match[3];
    const href = markdownUrl || bareUrl;
    const label = markdownLabel || bareUrl;

    parts.push(
      <a
        key={`line-${lineIndex}-link-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="ai-answer-link"
      >
        {label}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
};

const AiAnswerContent = ({ text, className = '' }) => {
  const answerText = String(text || '');
  const lines = answerText.split('\n');

  return (
    <div className={className}>
      {lines.map((line, index) => (
        <React.Fragment key={`line-${index}`}>
          {renderLineWithLinks(line, index)}
          {index < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </div>
  );
};

export default AiAnswerContent;
