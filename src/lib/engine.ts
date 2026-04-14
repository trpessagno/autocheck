import * as cheerio from 'cheerio';
import { processListing, CarListing } from '../../supabase/functions/process-listing/logic';
import { sendTelegramAlert } from './telegram';

export async function runScraperCycle(config: {
    parseBotKey: string; // Deprecated now, but kept in config to not break API Route
    telegramToken: string;
    telegramChatId: string;
    db: any; // Supabase client
    targetQuery?: { brand: string, model: string, year: string };
}) {
    console.log('🚀 Iniciando ciclo de scraping nativo (Cheerio) en MercadoLibre...');

    const brand = config.targetQuery?.brand || 'Toyota';
    const model = config.targetQuery?.model || 'Hilux';
    const year = config.targetQuery?.year || '2020';

    // Format ML Query
    // Example: "toyota-hilux-2020"
    const parsedQuery = encodeURIComponent(`${brand} ${model} ${year}`.toLowerCase().trim().replace(/\s+/g, '-'));
    const url = `https://autos.mercadolibre.com.ar/${parsedQuery}/_OrderId_PRICE_ASC`;
    
    console.log(`🌐 Scrapeando URL: ${url}`);
    
    let rawListings: CarListing[] = [];
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Fallo descargando MercadoLibre [HTTP ${response.status}]`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        $('.ui-search-layout__item').each((i, el) => {
            const node = $(el);
            
            const title = node.find('.poly-component__title').text().trim();
            const source_url = node.find('a.poly-component__title').attr('href') || node.find('a').attr('href') || '';
            
            const imgEl = node.find('img.poly-component__picture');
            const image_url = imgEl.attr('data-src') || imgEl.attr('src') || '';
            
            const rawPrice = node.find('.andes-money-amount__fraction').first().text().replace(/\./g, '').trim();
            const price_original = parseInt(rawPrice) || 0;
            
            const currencySymbol = node.find('.andes-money-amount__currency-symbol').first().text().trim();
            const currency = currencySymbol.includes('U$S') || currencySymbol.includes('US$') ? 'USD' : 'ARS';
            
            const location = node.find('.poly-component__location').text().trim() || 'Desconocido';
            const seller_type = node.find('.poly-component__official-store').length > 0 ? 'Agencia' : 'Particular';

            const attrs = node.find('.poly-attributes_list__item').map((_, e) => $(e).text().trim()).get();
            let parsedYear = parseInt(year);
            let km = 0;
            
            if (attrs.length > 0) {
                // Try grabbing year from first attribute if its length is 4 (e.g. 2018)
                const possibleYear = parseInt(attrs[0]);
                if (!isNaN(possibleYear) && possibleYear > 1900 && possibleYear <= new Date().getFullYear()+1) {
                    parsedYear = possibleYear;
                }
                
                // Km is usually the second attr, looking like "120.000 Km"
                const possibleKmStr = attrs.length > 1 ? attrs[1] : attrs[0];
                const possibleKm = parseInt(possibleKmStr.replace(/\./g, ''));
                if (!isNaN(possibleKm)) {
                    km = possibleKm;
                }
            }

            if (title && price_original > 0 && source_url) {
                rawListings.push({
                    title,
                    source_url,
                    image_url,
                    price_original,
                    currency,
                    brand,
                    model,
                    year: parsedYear,
                    km,
                    location,
                    seller_type
                });
            }
        });

    } catch (scrapeError) {
        console.error('❌ Fallo interno de extracción Cheerio:', scrapeError);
        throw scrapeError; 
    }

    if (!rawListings || rawListings.length === 0) {
        console.log('⚠️ El scraper no encontró autos. Quizás un error de parseo o una búsqueda vacía.');
        return { count: 0, error: 'MercadoLibre bloqueó la petición o la estructura HTML cambió de nuevo. Revisa la terminal.' };
    }

    console.log(`📦 "Extracted" ${rawListings.length} listings nativamente. Procesando anomalías...`);

    // Procesamos y guardamos en DB
    let processedCount = 0;
    let lastError = '';
    for (const raw of rawListings) {
        const processed = await processListing(raw, config.db);
        
        if (processed) {
            let { error } = await config.db
                .from('car_listings')
                .upsert(processed, { onConflict: 'source_url' });

            // Fail-safe for Supabase stuck schema cache
            if (error && error.message.includes('schema cache') && processed.image_url) {
                console.log('⚠️ Ignorando foto debido a caché de schema trabado en Supabase...');
                delete processed.image_url;
                const retry = await config.db.from('car_listings').upsert(processed, { onConflict: 'source_url' });
                error = retry.error;
            }

            if (error) {
                console.error(`❌ Error grabando ${processed.title}:`, error);
                lastError = error.message;
                continue;
            }
            
            processedCount++;

            if (processed.is_anomaly && processed.score > 8) {
                console.log(`🔥 Oportunidad (Score ${processed.score}) encontrada, pero Telegram está deshabilitado temporalmente.`);
                // await sendTelegramAlert(config.telegramToken, config.telegramChatId, processed);
            }
        }
    }

    console.log(`🏁 Extracción finalizada. ${processedCount} registros insertados en BD.`);
    return { count: processedCount, error: processedCount === 0 ? `Cero autos insertados. Último error BD: ${lastError}` : '' };
}
