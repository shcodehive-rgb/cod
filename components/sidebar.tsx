'use client';

import { Package, Megaphone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activePage: 'orders' | 'campaigns' | 'whatsapp';
  setActivePage: (page: 'orders' | 'campaigns' | 'whatsapp') => void;
}

export function Sidebar({ activePage, setActivePage }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
      {/* Logo / Title */}
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-white">COD Hub</h1>
        <p className="text-slate-400 text-sm mt-1">E-commerce Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-1">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 h-11 text-base',
            activePage === 'orders'
              ? 'bg-slate-800 text-white hover:bg-slate-700'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          )}
          onClick={() => setActivePage('orders')}
        >
          <Package size={20} />
          Orders
        </Button>

        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 h-11 text-base',
            activePage === 'whatsapp'
              ? 'bg-slate-800 text-white hover:bg-slate-700'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          )}
          onClick={() => setActivePage('whatsapp')}
        >
          <MessageCircle size={20} />
          WhatsApp Chat
        </Button>

        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 h-11 text-base',
            activePage === 'campaigns'
              ? 'bg-slate-800 text-white hover:bg-slate-700'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          )}
          onClick={() => setActivePage('campaigns')}
        >
          <Megaphone size={18} />
          Ad Campaigns
        </Button>
      </nav>

      {/* Footer */}
      <div className="pt-6 border-t border-slate-800">
        <p className="text-slate-500 text-xs">v1.0.0</p>
      </div>
    </div>
  );
}
