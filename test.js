const cheerio = require('cheerio');

async function test() {
    const url = 'https://autos.mercadolibre.com.ar/toyota-hilux-2020/_OrderId_PRICE_ASC';
    console.log('Fetching', url);
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items = $('.ui-search-layout__item');
    console.log('Found items:', items.length);

    if (items.length === 0) {
        console.log('HTML Snippet:', html.substring(0, 1000));
        return;
    }

    const first = items.first();
    const fs = require('fs');
    fs.writeFileSync('test.html', first.html());
    console.log('Saved to test.html');
}

test();
