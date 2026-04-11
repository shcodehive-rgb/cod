import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'meta-settings.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Read settings from file
const readSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return { pixelId: '', capiAccessToken: '' };
  } catch (error) {
    console.error('Error reading settings:', error);
    return { pixelId: '', capiAccessToken: '' };
  }
};

// Write settings to file
const writeSettings = (settings: any) => {
  try {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing settings:', error);
    return false;
  }
};

// GET - Fetch current settings
export async function GET() {
  try {
    const settings = readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in GET /api/settings/meta:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - Save settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pixelId, capiAccessToken } = body;

    // Validate input
    if (typeof pixelId !== 'string' || typeof capiAccessToken !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    const settings = {
      pixelId: pixelId.trim(),
      capiAccessToken: capiAccessToken.trim(),
      updatedAt: new Date().toISOString()
    };

    const success = writeSettings(settings);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Settings saved successfully',
        settings: { pixelId: settings.pixelId, capiAccessToken: settings.capiAccessToken }
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/settings/meta:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
