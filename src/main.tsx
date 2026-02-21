// Cache busting for Render deployment - 2026-02-01 v7.0 FINAL - COMMENT REACTIONS LIVE
console.log('🚀 H Social loaded with new reactions system v7.0 - COMMENT REACTIONS ENABLED - VERSION 1.0.4');

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mentions.css'

if (typeof window !== 'undefined' && typeof Selection !== 'undefined') {
  const originalGetRangeAt = Selection.prototype.getRangeAt;
  Selection.prototype.getRangeAt = function (index: number) {
    try {
      if (index === 0 && this.rangeCount === 0) {
        return document.createRange();
      }
      return originalGetRangeAt.call(this, index);
    } catch (e: any) {
      const message = e?.message;
      if (typeof message === 'string' && message.includes('getRangeAt') && message.includes('0 is not a valid index')) {
        return document.createRange();
      }
      throw e;
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
