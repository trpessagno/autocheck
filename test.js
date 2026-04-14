const cheerio = require('cheerio');

async function test() {
    const url = 'https://autos.mercadolibre.com.ar/toyota-hilux-2020/_OrderId_PRICE_ASC';
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const rawListings = [];

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
        let parsedYear = 2020;
        let km = 0;
        
        if (attrs.length > 0) {
            const possibleYear = parseInt(attrs[0]);
            if (!isNaN(possibleYear) && possibleYear > 1900 && possibleYear <= new Date().getFullYear()+1) {
                parsedYear = possibleYear;
            }
            const possibleKmStr = attrs.length > 1 ? attrs[1] : attrs[0];
            const possibleKm = parseInt(possibleKmStr.replace(/\./g, ''));
            if (!isNaN(possibleKm)) {
                km = possibleKm;
            }
        }

        if (title && price_original > 0 && source_url) {
            rawListings.push({ title, price_original, currency, source_url, location, seller_type, year: parsedYear, km, image_url });
        } else {
            console.log('Skipping due to missing fields', {title, price_original, source_url});
        }
    });

    console.log(`Extracted: ${rawListings.length} cars`);
    if(rawListings.length > 0) console.log('Sample:', rawListings[0]);
}

test();
