export interface DolarResponse {
  oficial: number;
  blue: number;
  mep: number;
  ccl: number;
}

export async function getDolarBlue(): Promise<number> {
  try {
    const response = await fetch('https://criptoya.com/api/dolar');
    if (!response.ok) {
        throw new Error(`CriptoYa API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.blue.ask; // We use 'ask' for conversion (cost to buy USD)
  } catch (error) {
    console.error('Error fetching dolar blue:', error);
    // Fallback value in case of API failure (updated manually or from cache in real scenario)
    return 1100; 
  }
}

export async function normalizeToUsd(price: number, currency: string, blueRate: number): Promise<number> {
  if (currency.toUpperCase() === 'USD') return price;
  return price / blueRate;
}
