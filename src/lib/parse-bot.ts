export interface ParseBotConfig {
    apiKey: string;
}

export interface ParseBotTaskResponse {
    task_id: string;
    matched: boolean;
    may_require_auth?: boolean;
}

export interface ParseBotGeneratedApi {
    id: string;
    scraper_id: string;
    source_url: string;
    execution_base_url: string;
    endpoints: {
        method: string;
        endpoint_name: string;
    }[];
}

export interface ParseBotStatusResponse {
    status: 'pending' | 'queued' | 'running' | 'needs_input' | 'completed' | 'failed';
    generated_api?: ParseBotGeneratedApi;
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

    /**
     * Paso 1: Crea la API
     */
    async dispatch(url: string, task: string): Promise<ParseBotTaskResponse> {
        console.log(`[ParseBot] Dispatching job for ${url}`);
        const response = await fetch(`${this.baseUrl}/dispatch`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ url, task }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Parse.bot dispatch failed [HTTP ${response.status}]: ${error}`);
        }

        return await response.json();
    }

    /**
     * Paso 2: Polling
     */
    async pollStatus(taskId: string, maxAttempts = 40): Promise<ParseBotGeneratedApi> {
        console.log(`[ParseBot] Polling for task ${taskId}...`);
        for (let i = 0; i < maxAttempts; i++) {
            const response = await fetch(`${this.baseUrl}/dispatch/tasks/${taskId}`, {
                method: 'GET',
                headers: this.headers,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Parse.bot polling failed [HTTP ${response.status}]: ${error}`);
            }

            const data: ParseBotStatusResponse = await response.json();
            
            console.log(`[ParseBot] Status: ${data.status}`);
            
            if (data.status === 'completed' && data.generated_api) {
                return data.generated_api;
            }

            if (data.status === 'failed') {
                throw new Error('Parse.bot task failed internally.');
            }

            // Wait 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Parse.bot polling timed out');
    }

    /**
     * Paso 3: Extraer datos
     */
    async extractData<T>(executionBaseUrl: string, endpointName: string, params: Record<string, any> = {}): Promise<T[]> {
        console.log(`[ParseBot] Extracting data from endpoint ${endpointName}`);
        
        const response = await fetch(`${executionBaseUrl}/${endpointName}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Parse.bot extraction failed: ${error}`);
        }

        const json = await response.json();
        
        // Parse.bot returns { "status": "success", "data": [ ... ] } Based on Quickstart
        if (json.data && Array.isArray(json.data)) {
            return json.data;
        }

        throw new Error('Unexpected data format from Parse.bot extraction endpoint');
    }

    /**
     * Orquestador completo para uso del engine
     */
    async runFullExtractionPipeline<T>(url: string, task: string): Promise<T[]> {
        // 1. Dispatch
        const dispatchRes = await this.dispatch(url, task);
        
        // 2. Poll (even if matched=true, the simplest way is to poll 1 time to get the generated_api schema)
        const generatedApi = await this.pollStatus(dispatchRes.task_id);

        if (!generatedApi.endpoints || generatedApi.endpoints.length === 0) {
            throw new Error('Parse.bot generated API without any endpoints.');
        }

        // 3. Extract using the very first generated endpoint
        const endpoint = generatedApi.endpoints[0];
        
        return await this.extractData<T>(generatedApi.execution_base_url, endpoint.endpoint_name, {});
    }
}
