'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, CheckCircle } from 'lucide-react';

export function SettingsPage() {

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={32} className="text-blue-400" />
          <h2 className="text-3xl font-bold text-white">Global Settings</h2>
        </div>
        <p className="text-slate-400">Configure your Meta integration and global platform settings</p>
      </div>

      <div className="max-w-4xl w-full space-y-6">
        {/* Meta Integration Card */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield size={20} className="text-green-400" />
              Meta Integration Settings
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your Meta integration is configured and managed securely through environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <CheckCircle size={20} className="text-green-400 mt-1" />
              <div className="space-y-2">
                <h3 className="text-white font-medium">Configuration Complete</h3>
                <p className="text-sm text-slate-300">
                  Your Facebook Pixel ID and CAPI Access Token are already configured in the server environment variables. 
                  This ensures secure credential management and consistent tracking across all campaigns.
                </p>
                <div className="text-xs text-slate-400 space-y-1 mt-3">
                  <p>Environment variables configured:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>META_PIXEL_ID - Facebook Pixel tracking</li>
                    <li>META_CAPI_ACCESS_TOKEN - Conversion API access</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500/20 rounded-full p-2 mt-1">
                <Shield size={16} className="text-blue-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-medium">Why Global Settings?</h3>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Centralized management of Meta credentials</li>
                  <li>• Consistent tracking across all campaigns</li>
                  <li>• Reduced configuration errors</li>
                  <li>• Easy credential updates without touching individual campaigns</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
