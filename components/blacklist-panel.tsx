'use client';

import { useState } from 'react';
import { AlertTriangle, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlacklistEntry } from '@/types/blacklist';

interface BlacklistPanelProps {
  blacklist: BlacklistEntry[];
  onRemove: (phone: string) => void;
}

export function BlacklistPanel({ blacklist, onRemove }: BlacklistPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-red-400" size={20} />
          <span className="font-semibold text-white">
            Blacklist ({blacklist.length})
          </span>
        </div>
        <ChevronDown 
          size={20} 
          className={`text-slate-400 transition transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-slate-700 p-4 bg-slate-900/50">
          {blacklist.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              No blacklisted customers yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {blacklist.map((entry) => (
                <div
                  key={entry.phone}
                  className="flex items-start justify-between p-3 bg-red-950/30 border border-red-700/30 rounded gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-white text-sm font-semibold">
                      {entry.phone}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {entry.reason}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Added: {new Date(entry.dateAdded).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(entry.phone)}
                    className="flex-shrink-0 p-1 hover:bg-red-700/50 rounded transition text-red-400"
                    title="Remove from blacklist"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
