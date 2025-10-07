import React from 'react';

interface CodeBallProps {
  code: string;
  color: string;
  size?: number; // px
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const CodeBall: React.FC<CodeBallProps> = ({ code, color, size = 30, className = '', style, title }) => {
  return (
    <div
      className={className}
      title={title || code}
      style={{
        background: color,
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 800,
        letterSpacing: 0.5,
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.35)',
        padding: '4px',
        ...style,
      }}
    >
      <span style={{ fontSize: Math.max(10, Math.floor(size * 0.40)) }}>{code}</span>
    </div>
  );
};

export default CodeBall;
