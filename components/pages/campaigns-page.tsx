'use client';

import { useState, useTransition, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignsTable } from '@/components/campaigns/campaigns-table';
import { SummaryMetrics } from '@/components/summary-metrics';
import { createCampaign, updateCampaign, deleteCampaign } from '@/app/actions';
import { RotateCcw } from 'lucide-react';
import { Campaign } from '@/types/campaign';
import { Order } from '@/types/order';

interface CampaignsPageProps {
  initialCampaigns: Campaign[];
  initialOrders: Order[];
  onCampaignsUpdate?: (campaigns: Campaign[]) => void;
}

export function CampaignsPage({ initialCampaigns, initialOrders, onCampaignsUpdate }: CampaignsPageProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [isPending, startTransition] = useTransition();
  const [pendingUpdate, setPendingUpdate] = useState<Campaign | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState<Campaign | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleAddCampaign = () => {
    const newCampaign: Campaign = {
      id: `temp-${Date.now()}`,
      name: '',
      isActive: true,
      plannedBudget: 0,
      actualSpent: 0,
      ordersGenerated: 0,
      adCopies: [],
    };
    
    setCampaigns(prev => {
      const updatedCampaigns = [...prev, newCampaign];
      onCampaignsUpdate?.(updatedCampaigns);
      return updatedCampaigns;
    });
  };

  const handleUpdateCampaign = (updatedCampaign: Campaign) => {
    setCampaigns(prev => {
      const updatedCampaigns = prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c);
      onCampaignsUpdate?.(updatedCampaigns);
      return updatedCampaigns;
    });

    // Set pending operation to be handled by useEffect
    if (!updatedCampaign.id.startsWith('temp-')) {
      setPendingUpdate(updatedCampaign);
    } else {
      setPendingCreate(updatedCampaign);
    }
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(prev => {
      const updatedCampaigns = prev.filter(c => c.id !== id);
      onCampaignsUpdate?.(updatedCampaigns);
      return updatedCampaigns;
    });

    // Set pending operation to be handled by useEffect
    if (!id.startsWith('temp-')) {
      setPendingDelete(id);
    }
  };

  const handleResetTestData = async () => {
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir réinitialiser les données de test ?\n\n' +
      'Cette action va :\n' +
      '1. Supprimer toutes les commandes et campagnes de test (avant aujourd\'hui)\n' +
      '2. Remettre à zéro les données financières des campagnes restantes\n' +
      '3. Forcer la synchronisation avec l\'API Facebook Insights\n\n' +
      'Cette action est irréversible !'
    );
    
    if (!confirmed) return;
    
    setIsResetting(true);
    try {
      const response = await fetch('/api/reset-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Réinitialisation réussie !\n\n` +
          `Supprimé : ${data.deletedRecords.orders} commandes, ${data.deletedRecords.campaigns} campagnes\n` +
          `Réinitialisé : ${data.resetCampaigns} campagnes\n\n` +
          `Les données réelles sont préservées. Actual Spent sera maintenant alimenté par l'API Facebook.`);
        
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert('Échec de la réinitialisation : ' + (data.error || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('Reset error:', err);
      alert('Échec de la réinitialisation. Veuillez réessayer.');
    } finally {
      setIsResetting(false);
    }
  };

  // Handle pending operations in useEffect to avoid startTransition during render
  useEffect(() => {
    if (pendingUpdate) {
      startTransition(async () => {
        await updateCampaign(pendingUpdate.id, pendingUpdate);
        setPendingUpdate(null);
      });
    }
  }, [pendingUpdate]);

  useEffect(() => {
    if (pendingDelete) {
      startTransition(async () => {
        await deleteCampaign(pendingDelete);
        setPendingDelete(null);
      });
    }
  }, [pendingDelete]);

  useEffect(() => {
    if (pendingCreate) {
      startTransition(async () => {
        await createCampaign(pendingCreate);
        setPendingCreate(null);
      });
    }
  }, [pendingCreate]);

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Ad Campaigns</h2>
        <p className="text-slate-400">Track your Facebook advertising campaigns and ROI</p>
      </div>

      {/* Summary Metrics */}
      <SummaryMetrics campaigns={campaigns} orders={initialOrders} />

      {/* Toolbar */}
      <div className="flex gap-4 mb-6">
        <Button
          onClick={handleAddCampaign}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus size={18} />
          New Campaign
        </Button>
        <Button
          onClick={handleResetTestData}
          disabled={isResetting || isPending}
          variant="outline"
          className="border-orange-600/50 text-orange-400 hover:bg-orange-950/30 gap-2"
        >
          <RotateCcw size={18} />
          {isResetting ? 'Réinitialisation...' : 'Reset Test Data'}
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg bg-slate-900">
        <CampaignsTable
          campaigns={campaigns}
          onUpdateCampaign={handleUpdateCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          orders={initialOrders}
        />
      </div>
    </div>
  );
}
