export async function sendTelegramAlert(token: string, chatId: string, car: any) {
    const savings = (car.median - car.price_usd).toFixed(0);
    const message = `
🚀 **¡OPORTUNIDAD DETECTADA!** 🚀
    
**${car.title}**
💰 Precio: USD ${car.price_usd.toLocaleString()}
📉 Ahorro estimado: **USD ${savings}** (${(car.savingsFactor * 100).toFixed(1)}%)
⭐ Score: **${car.score}/10**

📅 Año: ${car.year} | 🛣️ KM: ${car.km.toLocaleString()}
📍 Ubicación: ${car.location}

🔗 Ver publicación: ${car.source_url}
    `.trim();

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Telegram notification failed: ${error}`);
        }
    } catch (error) {
        console.error('Error sending Telegram alert:', error);
    }
}
