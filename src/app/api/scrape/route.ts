import { NextResponse } from 'next/server';
import { runScraperCycle } from '@/lib/engine';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { brand, model, year } = body;

        const result = await runScraperCycle({
            parseBotKey: process.env.PARSE_BOT_API_KEY || '',
            telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
            telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
            db: supabaseAdmin, // Inject the admin client for backend operations
            targetQuery: { brand, model, year }
        });

        if (result.count === 0) {
            return NextResponse.json({ success: false, error: result.error || 'No se insertaron autos.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Scraping cycle completed', count: result.count });
    } catch (error: any) {
        console.error('Scraping Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
