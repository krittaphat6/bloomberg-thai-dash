import { useState, useEffect } from 'react';

interface HistoricalSentiment {
  date: string;
  sentiment_mean: number;
  news_count: number;
  bullish_count: number;
  bearish_count: number;
}

const STORAGE_KEY = 'sentiment_history';
const MAX_DAYS = 30;

export function useSentimentHistory() {
  const [history, setHistory] = useState<HistoricalSentiment[]>([]);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load sentiment history:', e);
    }
  }, []);

  // Save daily sentiment
  const saveDailySentiment = (data: HistoricalSentiment) => {
    setHistory(prev => {
      // Remove duplicate date
      const filtered = prev.filter(h => h.date !== data.date);
      // Add new data and keep only last 30 days
      const updated = [...filtered, data].slice(-MAX_DAYS);
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save sentiment history:', e);
      }
      
      return updated;
    });
  };

  // Clear history
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear sentiment history:', e);
    }
  };

  return { history, saveDailySentiment, clearHistory };
}

export default useSentimentHistory;
