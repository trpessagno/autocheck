export interface ParseBotConfig {
    apiKey: string;
}

export interface ParseBotTaskResponse {
    task_id: string;
}

export interface ParseBotStatusResponse {
    status: 'pending' | 'running' | 'completed' | 'failed';
    generated_api?: {
        scraper_id: string;
        endpoints: string[];
    };
}

export class ParseBotClient {
    private apiKey: string;
    private baseUrl = 'https://api.parse.bot';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private get headers() {
        return {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
        };
    }

    async dispatch(url: string, description: string): Promise<string> {
        const response = await fetch(`${this.baseUrl}/dispatch`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ url, task: description, force_new: false }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Parse.bot dispatch failed: ${error}`);
        }

        const data: ParseBotTaskResponse = await response.json();
        return data.task_id;
    }

    async pollStatus(taskId: string, maxAttempts = 30): Promise<string> {
        for (let i = 0; i < maxAttempts; i++) {
            const response = await fetch(`${this.baseUrl}/dispatch/tasks/${taskId}`, {
                headers: this.headers,
            });

            if (!response.ok) {
                throw new Error('Parse.bot polling failed');
            }

            const data: ParseBotStatusResponse = await response.json();
            if (data.status === 'completed' && data.generated_api) {
                return data.generated_api.scraper_id;
            }

            if (data.status === 'failed') {
                throw new Error('Parse.bot task failed');
            }

            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Parse.bot polling timed out');
    }

    async extractData<T>(scraperId: string, params: Record<string, any> = {}): Promise<T[]> {
        // Most scrapers generated have an 'extract_data' or similar endpoint
        // We might need to handle the endpoint name dynamically from the task status
        const response = await fetch(`${this.baseUrl}/scraper/${scraperId}/extract_data`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Parse.bot extraction failed: ${error}`);
        }

        return await response.json();
    }
}
