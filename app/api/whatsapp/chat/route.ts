import { NextResponse } from 'next/server';

interface ChatThread {
  contact: {
    name?: string;
    phone: string;
    pushname?: string;
  };
  messages: Array<{
    id: string;
    text?: string;
    timestamp: number;
    fromMe: boolean;
    mediaUrl?: string;
    messageType?: 'text' | 'image';
  }>;
}

export async function GET() {
  try {
    const store: Record<string, ChatThread> = (global as any)._chatStore ?? {};

    // Sort threads by the timestamp of the latest message (newest first)
    const contacts = Object.values(store).sort((a, b) => {
      const lastA = a.messages.at(-1)?.timestamp ?? 0;
      const lastB = b.messages.at(-1)?.timestamp ?? 0;
      return lastB - lastA;
    });

    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    console.error('WhatsApp Chat GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
