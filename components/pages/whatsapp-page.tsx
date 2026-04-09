'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, CheckCircle, AlertCircle } from 'lucide-react';
import WhatsAppChat from '@/components/whatsapp/WhatsAppChat';

const WhatsAppPage = () => {
  const [qrCode, setQrCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('212'); // Default country code for Morocco
  const [pairingCode, setPairingCode] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'connected' | 'error' | 'waiting' | 'checking'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('Checking connection...');

  const generateQR = async (withPhone: boolean = false) => {
    setStatus('loading');
    setStatusMessage(withPhone ? 'Generating pairing code...' : 'Generating QR code...');
    setPairingCode('');
    
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: withPhone ? phoneNumber : undefined }),
      });

      const result = await response.json();
      
      if (result.success) {
        setQrCode(result.qrCode);
        if (result.pairingCode) {
          // Format pairing code as XXXX-XXXX
          const formatted = result.pairingCode.toUpperCase();
          const display = formatted.slice(0, 4) + '-' + formatted.slice(4);
          setPairingCode(display);
          setStatusMessage('Enter this code in your WhatsApp mobile app');
        } else {
          setStatusMessage('Scan QR code with WhatsApp mobile app');
        }
        setStatus('waiting');
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to initialize session');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage('Failed to connect to WhatsApp');
      console.error('WhatsApp connection error:', error);
    }
  };

  // ── Mount: hydrate UI from backend session state ────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/whatsapp');
        const result = await response.json();
        if (result.status === 'connected') {
          setStatus('connected');
          setStatusMessage('WhatsApp connected successfully!');
        } else {
          setStatus('idle');
          setStatusMessage('Click to generate QR code');
        }
      } catch {
        setStatus('idle');
        setStatusMessage('Click to generate QR code');
      }
    };
    checkStatus();
  }, []);

  // ── Poll: watch for scan/pairing confirmation ────────────────────────────
  useEffect(() => {
    if (status === 'waiting') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/whatsapp');
          const result = await response.json();
          if (result.status === 'connected') {
            setStatus('connected');
            setPairingCode('');
            setStatusMessage('WhatsApp connected successfully!');
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
      case 'checking':
        return <Loader2 className="animate-spin" size={24} />;
      case 'connected':
        return <CheckCircle size={24} className="text-green-500" />;
      case 'waiting':
        return <QrCode size={24} className="text-blue-500" />;
      case 'error':
        return <AlertCircle size={24} className="text-red-500" />;
      default:
        return <QrCode size={24} className="text-slate-400" />;
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/whatsapp', { method: 'DELETE' });
    } catch (e) {
      console.error('Disconnect error:', e);
    }
    setStatus('idle');
    setQrCode('');
    setPairingCode('');
    setStatusMessage('Click to generate QR code');
  };

  const isConnected = status === 'connected';

  if (status === 'checking') {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-lg font-medium">Checking connection...</span>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">WhatsApp Inbox</h2>
          <p className="text-slate-400 text-sm">Messages from your connected WhatsApp account</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <WhatsAppChat onDisconnect={handleDisconnect} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full text-center">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">WhatsApp Integration</h2>
          <p className="text-slate-400">Connect your WhatsApp account for customer notifications</p>
        </div>

        {/* ── CONNECTED STATE ──────────────────────────────────────────────── */}
        {isConnected && (
          <div className="space-y-6">
            <div className="p-8 bg-slate-900 border-2 border-green-500 rounded-2xl shadow-2xl">
              <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-400 mb-1">Connected!</h3>
              <p className="text-slate-400 text-sm">
                Your WhatsApp account is linked and ready to send notifications.
              </p>
            </div>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="w-full border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300 py-5"
            >
              Disconnect WhatsApp
            </Button>
          </div>
        )}

        {/* ── AUTH STATE (QR / Pairing) ─────────────────────────────────────── */}
        {!isConnected && (
          <>
            {/* Status indicator */}
            <div className={`mb-6 flex items-center justify-center gap-3 ${
              status === 'loading' ? 'text-blue-400' :
              status === 'waiting' ? 'text-blue-400' :
              status === 'error'   ? 'text-red-400'  :
              'text-slate-400'
            }`}>
              {getStatusIcon()}
              <span className="text-lg font-medium">{statusMessage}</span>
            </div>

            {/* Pairing Code display */}
            {pairingCode && (
              <div className="mb-8 p-8 bg-slate-900 border-2 border-green-500 rounded-xl shadow-2xl">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-4">Pairing Code</p>
                <div className="text-5xl font-mono font-black text-green-400 tracking-tighter">
                  {pairingCode}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Open WhatsApp → Linked Devices → Link a Device → Link with phone number instead
                </p>
              </div>
            )}

            {/* QR Code display */}
            {qrCode && !pairingCode && (
              <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto" />
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-4">
              <Button
                onClick={() => generateQR(false)}
                disabled={status === 'loading' || status === 'waiting'}
                className="w-full bg-green-600 hover:bg-green-700 gap-2 py-6 text-lg font-bold shadow-lg"
              >
                {status === 'loading' && !pairingCode ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <QrCode size={20} />
                )}
                {status === 'waiting' && qrCode ? 'Waiting for scan...' : 'Scan QR Code'}
              </Button>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-950 px-2 text-slate-500">Or link with phone number</span>
                </div>
              </div>

              {/* Phone number input + pairing button */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="2126..."
                    className="flex-1 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    disabled={status === 'loading' || status === 'waiting'}
                  />
                  <Button
                    onClick={() => generateQR(true)}
                    disabled={status === 'loading' || status === 'waiting' || phoneNumber.length < 8}
                    variant="outline"
                    className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white px-6"
                  >
                    {status === 'loading' && pairingCode === '' ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      'Get Pairing Code'
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 text-left px-1 italic">
                  Include country code, digits only (e.g., 212688771251)
                </p>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );

};

export default WhatsAppPage;
