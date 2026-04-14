import { NextResponse } from 'next/server';
import { runScraperCycle } from '@/lib/engine';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { queryUrl } = body;

        // You can limit the query to avoid abuse or run a default one.
        const defaultUrl = 'https://autos.mercadolibre.com.ar/autos-camionetas/capital-federal/particular/_OrderId_PRICE_ASC';
        const targetUrl = queryUrl || defaultUrl;

        // In a real MVP, you might want to run this asynchronously and return a 200 immediately,
        // or wait for the result if it's fast enough. Parse bot takes time, so we'll wait 
        // to show loading indicator in the UI.

        await runScraperCycle({
            parseBotKey: process.env.PARSE_BOT_API_KEY || '',
            telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
            telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
            db: supabaseAdmin, // Inject the admin client for backend operations
            targetUrl: targetUrl
        });

        return NextResponse.json({ success: true, message: 'Scraping cycle completed' });
    } catch (error: any) {
        console.error('Scraping Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
