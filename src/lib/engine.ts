import { ParseBotClient } from './parse-bot';
import { processListing, CarListing } from '../../supabase/functions/process-listing/logic';
import { sendTelegramAlert } from './telegram';

export async function runScraperCycle(config: {
    parseBotKey: string;
    telegramToken: string;
    telegramChatId: string;
    db: any; // Supabase client
    targetQuery?: { brand: string, model: string, year: string };
}) {
    console.log('🚀 Iniciando ciclo de scraping internamente (Modo Mock debido a Parse.bot)...');

    const brand = config.targetQuery?.brand || 'Toyota';
    const model = config.targetQuery?.model || 'Hilux';
    const year = parseInt(config.targetQuery?.year || '2020');

    // Simulate Network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generar precios realistas basados en modelo
    let basePriceUsd = 20000;
    let imageUrl = '';

    if (model === 'Hilux') {
        basePriceUsd = 28000;
        imageUrl = 'https://http2.mlstatic.com/D_NQ_NP_2X_706497-MLA74062562547_012024-F.webp';
    } else if (model === 'Corolla') {
        basePriceUsd = 18000;
        imageUrl = 'https://http2.mlstatic.com/D_NQ_NP_2X_910793-MLA74017684042_012024-F.webp';
    } else if (model === 'Amarok') {
        basePriceUsd = 26000;
        imageUrl = 'https://http2.mlstatic.com/D_NQ_NP_2X_635293-MLA74338421867_022024-F.webp';
    } else if (model === 'Vento') {
        basePriceUsd = 19000;
        imageUrl = 'https://http2.mlstatic.com/D_NQ_NP_2X_613478-MLA74526541604_022024-F.webp';
    } else {
        basePriceUsd = 15000;
        imageUrl = 'https://http2.mlstatic.com/D_NQ_NP_2X_824707-MLA73967007261_012024-F.webp';
    }

    // Convert to ARS since algorithm converts back to USD
    // Dolar approx 1000 ARS
    const basePriceArs = basePriceUsd * 1000;

    // Generamos 4 autos de mercado normales y 1 ganga
    const rawListings: CarListing[] = [
        {
            source_url: `https://autos.mercadolibre.com.ar/test-normal-1-${Date.now()}`,
            title: `${brand} ${model} 2.0 (Normal)`,
            brand: brand,
            model: model,
            year: year,
            km: 45000,
            price_original: basePriceArs * 1.05,
            currency: 'ARS',
            location: 'CABA',
            seller_type: 'Particular',
            image_url: imageUrl
        },
        {
            source_url: `https://autos.mercadolibre.com.ar/test-normal-2-${Date.now()}`,
            title: `${brand} ${model} SRV - IMPECABLE`,
            brand: brand,
            model: model,
            year: year,
            km: 55000,
            price_original: basePriceArs * 0.98,
            currency: 'ARS',
            location: 'GBA Norte',
            seller_type: 'Agencia',
            image_url: imageUrl
        },
        {
            source_url: `https://autos.mercadolibre.com.ar/test-normal-3-${Date.now()}`,
            title: `${brand} ${model} Unico dueño`,
            brand: brand,
            model: model,
            year: year,
            km: 41000,
            price_original: basePriceArs * 1.02,
            currency: 'ARS',
            location: 'CABA',
            seller_type: 'Particular',
            image_url: imageUrl
        },
        {
            source_url: `https://autos.mercadolibre.com.ar/test-ganga-${Date.now()}`,
            title: `${brand} ${model} OPORTUNIDAD URGENTE X VIAJE`,
            brand: brand,
            model: model,
            year: year,
            km: 48000,
            price_original: basePriceArs * 0.75, // 25% OFF -> Ganga!!
            currency: 'ARS',
            location: 'Palermo, CABA',
            seller_type: 'Particular',
            image_url: imageUrl
        }
    ];

    console.log(`📦 "Extracted" ${rawListings.length} mock listings. Processing...`);

    // 4. Process each listing
    for (const raw of rawListings) {
        // En nuestro logic.ts original se requiere > 3 registros en DB para evaluar anomalías.
        // Dado que la DB esta limpia, si insertamos uno por uno, la lógica de mediana 
        // recién marcará a partir del 4to! (Justo la OPORTUNIDAD URGENTE).
        const processed = await processListing(raw, config.db);
        
        if (processed) {
            // Save to DB
            const { error } = await config.db
                .from('car_listings')
                .upsert(processed, { onConflict: 'source_url' });

            if (error) {
                console.error(`❌ Error saving ${processed.title}:`, error);
                continue;
            }

            // 5. Telegram Alert
            if (processed.is_anomaly && processed.score > 8) {
                console.log(`🔥 Gang detectada! Enviando alerta para ${processed.title}`);
                await sendTelegramAlert(config.telegramToken, config.telegramChatId, processed);
            }
        }
    }

    console.log('🏁 Ciclo mock completado.');
}
