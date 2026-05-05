// Cache busting for Render deployment - 2026-02-01 v7.0 FINAL - COMMENT REACTIONS LIVE
console.log('🚀 HIDEON loaded with new reactions system v7.0 - COMMENT REACTIONS ENABLED - VERSION 1.0.4');

import { installSupabaseStorageBlocker } from '@/lib/block-supabase-storage';

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mentions.css'

installSupabaseStorageBlocker();

const ENABLE_R2_MIGRATION_TOOLS = String((import.meta as any)?.env?.VITE_ENABLE_R2_MIGRATION_TOOLS || '').toLowerCase() === 'true';

if (ENABLE_R2_MIGRATION_TOOLS && typeof window !== 'undefined') {
  import('./scripts/migrate-to-r2');
}

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
