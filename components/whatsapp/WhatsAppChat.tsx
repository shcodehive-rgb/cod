'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  LogOut, MessageSquare, Phone, User, ExternalLink, Send,
  Loader2, Paperclip, Archive, ArchiveRestore, X, Reply, ArrowRight,
  Search, CheckCircle2, Tag, Plus, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

interface ContactMetadata {
  id: string; // The senderNumber
  tags: string[];
  isArchived: boolean;
  realCustomerNumber?: string;
  jid?: string;
  lastMessage?: string;
  timestamp?: string;
}

interface InboxMessage {
  id: string;
  senderNumber: string;
  realCustomerNumber?: string;
  messageBody: string;
  messageType?: 'text' | 'image';
  mediaUrl?: string | null;
  timestamp: string;
  fromMe: boolean;
  isProcessed: boolean;
  hasPotentialOrder: boolean;
  jid?: string;
  isArchived?: boolean;
  rawMessage?: any;
  quotedMsg?: any;
}

interface Props {
  onDisconnect: () => void;
}

type Tab = 'active' | 'archived';

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const PREDEFINED_TAGS = [
  { label: '🟢 VIP (Delivered)', value: 'VIP', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { label: '🔴 Blacklist (Retour)', value: 'Blacklist', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { label: '🟡 Lead', value: 'Lead', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
];

// ── UTILITIES ────────────────────────────────────────────────────────────────
function formatTime(isoStr: string) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(isoStr: string) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatJid(jid: string | undefined, senderNumber: string, realNum?: string) {
  // 1. Priority: Best possible resolved phone number
  const rawId = realNum || jid || senderNumber;
  const num = rawId.split('@')[0];

  // 2. Identify LIDs (Starting with 4498/2260 or unusually long)
  const isLid = num.startsWith('4498') || num.startsWith('2260') || (num.length > 13 && !num.startsWith('212'));

  if (isLid) {
    // Check if we have a real number mapped elsewhere
    if (realNum && !realNum.startsWith('4498')) return realNum.startsWith('212') ? `+${realNum}` : realNum;
    return 'WhatsApp Contact';
  }

  // 3. Moroccan Formatting
  if (num.startsWith('212')) return `+${num}`;
  
  return num;
}

function renderMessageBody(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
           className="text-indigo-400 underline hover:text-indigo-300 break-all">
          {part}
        </a>
      );
    }
    return part;
  });
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function WhatsAppChat({ onDisconnect }: Props) {
  const [messages, setMessages]               = useState<InboxMessage[]>([]);
  const [contactsMeta, setContactsMeta]       = useState<Record<string, ContactMetadata>>({});
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [inputText, setInputText]             = useState('');
  const [isSending, setIsSending]             = useState(false);
  const [tab, setTab]                         = useState<Tab>('active');
  const [imagePreview, setImagePreview]       = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [isArchiving, setIsArchiving]         = useState(false);
  
  const [replyingTo, setReplyingTo]           = useState<InboxMessage | null>(null);
  const [forwardingMsg, setForwardingMsg]     = useState<InboxMessage | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardSearch, setForwardSearch]     = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const scrollRef                             = useRef<HTMLDivElement>(null);
  const fileInputRef                          = useRef<HTMLInputElement>(null);

  // ── 1. Real-time Messages Listener ───────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'whatsapp_inbox'), orderBy('timestamp', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: InboxMessage[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as InboxMessage));
      setMessages(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  // ── 2. Real-time Contact Metadata Listener ────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'whatsapp_contacts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meta: Record<string, ContactMetadata> = {};
      snapshot.forEach(doc => meta[doc.id] = { id: doc.id, ...doc.data() } as ContactMetadata);
      setContactsMeta(meta);
    });
    return () => unsubscribe();
  }, []);

  // ── 3. Derived Contact List (Merging Messages + Centralized Metadata) ────
  const contacts = useMemo(() => {
    const contactMap = new Map<string, any>();
    
    // Start with data derived from messages
    [...messages]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(m => {
        contactMap.set(m.senderNumber, {
          senderNumber: m.senderNumber,
          jid: m.jid,
          realCustomerNumber: m.realCustomerNumber,
          messageBody: m.messageBody,
          messageType: m.messageType,
          timestamp: m.timestamp,
          fromMe: m.fromMe,
          hasPotentialOrder: m.hasPotentialOrder,
          isArchived: m.isArchived || false,
          tags: []
        });
      });

    // Layer on centralized metadata (if available)
    Object.values(contactsMeta).forEach(meta => {
      const existing = contactMap.get(meta.id);
      contactMap.set(meta.id, {
        ...(existing || {}),
        senderNumber: meta.id,
        jid: meta.jid || existing?.jid,
        realCustomerNumber: meta.realCustomerNumber || existing?.realCustomerNumber,
        isArchived: meta.isArchived, // Centralized source of truth
        tags: meta.tags || []
      });
    });

    return Array.from(contactMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages, contactsMeta]);

  const activeContacts   = contacts.filter(c => !c.isArchived);
  const archivedContacts = contacts.filter(c => c.isArchived);
  const visibleContacts  = tab === 'active' ? activeContacts : archivedContacts;

  // ── 4. Chat messages for selected contact ────────────────────────────────
  const chatMessages = useMemo(() => {
    if (!selectedContact) return [];
    return messages
      .filter(m => m.senderNumber === selectedContact)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, selectedContact]);

  const activeContact = contacts.find(c => c.senderNumber === selectedContact);
  const isSelectedArchived = activeContact?.isArchived ?? false;
  const activeTags = activeContact?.tags || [];

  // ── 5. Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, selectedContact]);

  // ── 6. File Selection ───────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setImagePreview({
        base64: base64String,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // ── 6. Send logic (Text & Image) ──────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeContact?.jid || isSending) return;
    setIsSending(true);
    try {
      const resp = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jid: activeContact.jid, 
          text: inputText.trim(),
          quotedMsg: replyingTo?.rawMessage
        }),
      });
      
      if (resp.ok) { 
        setInputText(''); 
        setReplyingTo(null); 
      } else {
        const errorData = await resp.json().catch(() => ({}));
        console.error('Send failed:', errorData);
        
        // Show specific error message to user
        if (errorData.needsReconnect) {
          alert('🔌 WhatsApp not connected. Please scan QR code to reconnect.');
          // Trigger reconnection by refreshing status
          window.location.reload();
        } else if (errorData.status === 'socket_not_ready') {
          alert('⏳ WhatsApp connecting... Please wait a moment and try again.');
        } else {
          alert(`❌ Failed to send: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('❌ Network error. Please check your connection and try again.');
    } finally { 
      setIsSending(false); 
    }
  };

  const handleSendImage = async () => {
    if (!imagePreview || !activeContact?.jid || isSending) return;
    setIsSending(true);
    try {
      const resp = await fetch('/api/whatsapp/send-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: activeContact.jid,
          imageBase64: imagePreview.base64,
          mimeType: imagePreview.mimeType,
          caption: inputText.trim(),
          fileName: imagePreview.name,
          quotedMsg: replyingTo?.rawMessage 
        }),
      });
      
      if (resp.ok) { 
        setImagePreview(null); 
        setInputText(''); 
        setReplyingTo(null); 
      } else {
        const errorData = await resp.json().catch(() => ({}));
        console.error('Send image failed:', errorData);
        
        // Show specific error message to user
        if (errorData.needsReconnect) {
          alert('🔌 WhatsApp not connected. Please scan QR code to reconnect.');
          window.location.reload();
        } else if (errorData.status === 'socket_not_ready') {
          alert('⏳ WhatsApp connecting... Please wait a moment and try again.');
        } else {
          alert(`❌ Failed to send image: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Send image error:', error);
      alert('❌ Network error. Please check your connection and try again.');
    } finally { 
      setIsSending(false); 
    }
  };

  // ── 7. Tag Management ─────────────────────────────────────────────────────
  const toggleTag = async (tag: string, action: 'add' | 'remove') => {
    if (!selectedContact) return;
    try {
      await fetch('/api/whatsapp/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact, tag, action }),
      });
    } catch { alert('❌ Failed to update tag.'); }
  };

  // ── 8. Archive & Forward ──────────────────────────────────────────────────
  const handleArchiveToggle = async () => {
    if (!selectedContact || isArchiving) return;
    setIsArchiving(true);
    const newArchiveState = !isSelectedArchived;
    try {
      await fetch('/api/whatsapp/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact, isArchived: newArchiveState }),
      });
      setTab(newArchiveState ? 'archived' : 'active');
      setSelectedContact(null);
    } finally { setIsArchiving(false); }
  };

  const handleForward = async (targetContact: string) => {
    if (!forwardingMsg || isSending) return;
    setIsSending(true);
    try {
      const resp = await fetch('/api/whatsapp/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetJid: targetContact,
          sourceMsg: forwardingMsg.rawMessage,
          textFallback: forwardingMsg.messageBody,
          mediaUrlFallback: forwardingMsg.mediaUrl,
          messageType: forwardingMsg.messageType
        }),
      });
      if (resp.ok) { setIsForwardModalOpen(false); setForwardingMsg(null); setSelectedContact(targetContact.split('@')[0]); }
    } finally { setIsSending(false); }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-160px)] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 backdrop-blur-xl shadow-2xl">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <div className="flex w-84 flex-col border-r border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
              <MessageSquare size={18} />
            </div>
            <h3 className="font-bold text-white tracking-tight">Inbox Leads</h3>
          </div>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-700">
            {visibleContacts.length}
          </span>
        </div>

        <div className="flex border-b border-slate-800">
          {(['active', 'archived'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedContact(null); }}
              className={`flex-1 py-2.5 text-xs font-semibold tracking-wide capitalize transition-colors ${
                tab === t ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t} {t === 'active' ? `(${activeContacts.length})` : `(${archivedContacts.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500 italic text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              Loading...
            </div>
          )}
          {!loading && visibleContacts.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 py-12 text-center">
              <div className="rounded-full bg-slate-900 p-4"><User size={32} className="text-slate-700" /></div>
              <p className="text-sm text-slate-500">{tab === 'archived' ? 'No archived chats.' : 'No active leads.'}</p>
            </div>
          )}

          {visibleContacts.map((contact) => {
            const isActive = selectedContact === contact.senderNumber;
            return (
              <button
                key={contact.senderNumber}
                onClick={() => setSelectedContact(contact.senderNumber)}
                className={`relative flex w-full items-center gap-3 border-b border-slate-800/40 px-5 py-4 text-left transition-all duration-200 ${
                  isActive ? 'bg-slate-800/80 shadow-inner' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-lg ${
                  contact.hasPotentialOrder ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {contact.senderNumber.slice(-2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-100 truncate">
                      {formatJid(contact.jid, contact.senderNumber, contact.realCustomerNumber)}
                    </span>
                    <span className="ml-2 flex-shrink-0 text-[10px] text-slate-500">{formatDateLabel(contact.timestamp)}</span>
                  </div>
                  
                  {/* Tag Badges in Sidebar */}
                  {contact.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {contact.tags.map((t: string) => (
                        <div key={t} className={`h-1.5 w-4 rounded-full ${
                          t === 'VIP' ? 'bg-green-500' : t === 'Blacklist' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                      ))}
                    </div>
                  )}

                  <p className="truncate text-[11px] text-slate-400 leading-tight">
                    {contact.fromMe && <span className="text-green-500/80 font-bold mr-1">You:</span>}
                    {contact.messageType === 'image' ? '📷 Photo' : contact.messageBody}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-800 bg-slate-950/20 p-4">
          <Button onClick={onDisconnect} variant="outline" className="w-full border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 text-xs">
            <LogOut size={14} className="mr-2" />Terminate Connection
          </Button>
        </div>
      </div>

      {/* ── MAIN CHAT ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-950/20">
        {selectedContact && activeContact ? (
          <>
            <div className="flex items-center gap-4 border-b border-slate-800 bg-slate-900/30 px-6 py-4 backdrop-blur-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-xl">
                {selectedContact.slice(-2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Phone size={14} className="text-slate-500" />
                  <span className="font-bold text-white">
                    {formatJid(activeContact.jid, selectedContact, activeContact.realCustomerNumber)}
                  </span>
                  {activeContact.tags?.map((t: string) => {
                    const config = PREDEFINED_TAGS.find(pt => pt.value === t);
                    return config ? (
                      <span key={t} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${config.color}`}>
                        {config.label.split(' ')[1]}
                      </span>
                    ) : null;
                  })}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-[10px] text-slate-500">{chatMessages.length} messages</p>
                  
                  {/* Tag Management Toggle */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <Plus size={10} /> Add Tag
                    </button>
                    {isTagDropdownOpen && (
                      <div className="absolute top-6 left-0 z-50 w-48 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Tags</span>
                          <X size={10} className="cursor-pointer" onClick={() => setIsTagDropdownOpen(false)} />
                        </div>
                        {PREDEFINED_TAGS.map(t => {
                          const isApplied = activeTags.includes(t.value);
                          return (
                            <button
                              key={t.value}
                              onClick={() => { toggleTag(t.value, isApplied ? 'remove' : 'add'); setIsTagDropdownOpen(false); }}
                              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-slate-800 transition-colors"
                            >
                              <span className="text-xs text-slate-200">{t.label}</span>
                              {isApplied && <Trash2 size={12} className="text-red-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleArchiveToggle}
                disabled={isArchiving}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-amber-500/40 hover:text-amber-400 transition-all disabled:opacity-50"
              >
                {isArchiving ? <Loader2 size={14} className="animate-spin" /> : isSelectedArchived ? <><ArchiveRestore size={14} /> Unarchive</> : <><Archive size={14} /> Archive</>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4" style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, #1e293b 1.5px, transparent 0)', backgroundSize: '32px 32px' }}>
              {chatMessages.map((msg, idx) => {
                const prev = chatMessages[idx - 1];
                const showDate = !prev || formatDateLabel(prev.timestamp) !== formatDateLabel(msg.timestamp);
                return (
                  <div key={msg.id} className="group transition-all duration-300">
                    {showDate && (
                      <div className="my-6 flex items-center justify-center">
                        <span className="rounded-full bg-slate-900/80 border border-slate-800 px-4 py-1 text-[10px] font-bold tracking-widest uppercase text-slate-400">{formatDateLabel(msg.timestamp)}</span>
                      </div>
                    )}
                    <div className={`flex flex-col ${msg.fromMe ? 'items-end' : 'items-start'} max-w-full`}>
                      <div className={`relative max-w-[80%] rounded-2xl p-1 shadow-xl backdrop-blur-sm ${msg.fromMe ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-800/80 border border-slate-700/50'}`}>
                        {msg.quotedMsg && (
                          <div className={`mx-1 mt-1 mb-2 rounded-lg border-l-4 p-2 text-[11px] backdrop-blur-md ${msg.fromMe ? 'border-indigo-400 bg-white/10 text-indigo-100' : 'border-indigo-500 bg-black/20 text-slate-300'}`}>
                            <p className="font-bold opacity-80 mb-0.5 flex items-center gap-1"><Reply size={10} className="opacity-50" /> {msg.quotedMsg.key?.fromMe ? 'You' : formatJid(undefined, msg.senderNumber, msg.realCustomerNumber)}</p>
                            <p className="truncate opacity-70 italic line-clamp-2">{msg.quotedMsg.message?.conversation || msg.quotedMsg.message?.extendedTextMessage?.text || (msg.quotedMsg.message?.imageMessage ? '📷 Photo' : '...')}</p>
                          </div>
                        )}
                        {msg.messageType === 'image' && msg.mediaUrl && (
                          <div className="relative px-1 pt-1"><img src={msg.mediaUrl} alt="WA Media" className="max-h-96 w-full rounded-xl object-contain cursor-pointer" onClick={() => window.open(msg.mediaUrl!, '_blank')} /></div>
                        )}
                        {msg.messageBody && <p className="px-4 py-2 text-sm font-medium leading-relaxed text-slate-100 whitespace-pre-wrap">{renderMessageBody(msg.messageBody)}</p>}
                        <div className={`px-4 pb-2 pt-1 flex items-center justify-between gap-4 transition-opacity group-hover:opacity-100 ${msg.fromMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[9px] font-medium uppercase text-slate-400 opacity-90">{formatTime(msg.timestamp)}</span>
                          <div className={`flex items-center gap-2 ${msg.fromMe ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <button 
                              onClick={() => {
                                setReplyingTo(msg);
                                // Focus input after small delay
                                setTimeout(() => document.querySelector('input')?.focus(), 50);
                              }} 
                              className="rounded-full bg-slate-950/40 p-1.5 text-white hover:text-indigo-400 shadow-sm border border-slate-700/50"
                              title="Reply"
                            >
                              <Reply size={14} className="text-white" />
                            </button>
                            <button onClick={() => { setForwardingMsg(msg); setIsForwardModalOpen(true); }} className="rounded-full bg-slate-950/40 p-1.5 text-slate-400 hover:text-green-400 shadow-sm border border-slate-700/50"><ArrowRight size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="border-t border-slate-800 bg-slate-900/40 p-5 px-8 backdrop-blur-xl">
              {replyingTo && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-900/20 p-3">
                  <div className="w-1 self-stretch rounded-full bg-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Replying to {replyingTo.fromMe ? 'yourself' : formatJid(replyingTo.jid, replyingTo.senderNumber)}</p>
                    <p className="truncate text-xs text-slate-400 mt-0.5">{replyingTo.messageType === 'image' ? '📷 Photo' : replyingTo.messageBody}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-200"><X size={16} /></button>
                </div>
              )}
              {imagePreview && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-900/20 p-3">
                  <img src={`data:${imagePreview.mimeType};base64,${imagePreview.base64}`} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-slate-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-300 truncate">{imagePreview.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ready to send</p>
                  </div>
                  <button onClick={() => setImagePreview(null)} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-200"><X size={16} /></button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-indigo-400"><Paperclip size={20} /></button>
                <div className="relative flex-1"><input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') imagePreview ? handleSendImage() : handleSendMessage(); }} placeholder={imagePreview ? 'Add a caption...' : replyingTo ? 'Type your reply...' : 'Type a message...'} className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-6 py-3.5 text-sm text-slate-100 focus:border-indigo-500/50 outline-none transition-all" /></div>
                <Button onClick={imagePreview ? handleSendImage : handleSendMessage} disabled={(!inputText.trim() && !imagePreview) || isSending} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 transition-all">{isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center p-12">
            <div className="relative">
              <div className="absolute -inset-4 bg-green-500/10 blur-2xl rounded-full" /><div className="relative rounded-full bg-slate-900 p-8 border border-slate-800/50 shadow-2xl"><MessageSquare size={56} className="text-slate-700" /></div>
            </div>
            <div className="max-w-xs"><h4 className="text-lg font-bold text-slate-200">Ready to Segment</h4><p className="mt-2 text-xs leading-relaxed text-slate-500">Select a lead to start tagging and organizing your retention strategy.</p></div>
          </div>
        )}
      </div>

      {/* ── FORWARD MODAL ───────────────────────────────────────────────── */}
      {isForwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5"><h3 className="font-bold text-white text-lg">Forward Message</h3><button onClick={() => { setIsForwardModalOpen(false); setForwardingMsg(null); }} className="rounded-full p-2 text-slate-500 hover:bg-slate-800"><X size={20} /></button></div>
            <div className="px-6 py-4"><div className="relative"><Search className="absolute left-3 top-3 text-slate-500" size={18} /><input type="text" placeholder="Search contacts..." value={forwardSearch} onChange={(e) => setForwardSearch(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-indigo-500/50" /></div></div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar px-3 pb-6">
              {contacts.filter(c => !forwardSearch || formatJid(c.jid, c.senderNumber, c.realCustomerNumber).includes(forwardSearch)).map(contact => (
                <button key={contact.senderNumber} onClick={() => handleForward(contact.jid || `${contact.senderNumber}@s.whatsapp.net`)} disabled={isSending} className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left hover:bg-slate-800/50 transition-all group">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 font-bold border border-slate-700">{contact.senderNumber.slice(-2)}</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-slate-100 text-sm truncate">{formatJid(contact.jid, contact.senderNumber, contact.realCustomerNumber)}</p><p className="text-[11px] text-slate-500 truncate">Last active: {formatDateLabel(contact.timestamp)}</p></div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle2 size={18} className="text-indigo-500" /></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
