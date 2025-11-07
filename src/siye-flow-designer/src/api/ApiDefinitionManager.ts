import { ApiDefinition, ApiDefinitionLoader } from './ApiDefinitionLoader';

/**
 * Manages loaded API definitions and provides them to the palette
 */
export class ApiDefinitionManager {
    private apiDefinitions: Map<string, ApiDefinition> = new Map();
    private callbacks: Set<(apis: ApiDefinition[]) => void> = new Set();
    
    /**
     * Load API definition from URL
     */
    async loadFromUrl(url: string): Promise<ApiDefinition> {
        try {
            const api = await ApiDefinitionLoader.loadFromUrl(url);
            this.apiDefinitions.set(api.id, api);
            this.notifyChange();
            return api;
        } catch (error) {
            throw new Error(`Failed to load API from ${url}: ${error}`);
        }
    }
    
    /**
     * Load API definition from JSON object
     */
    loadFromJson(json: any, name?: string): ApiDefinition {
        const api = ApiDefinitionLoader.parseOpenApi(json);
        if (name) {
            api.name = name;
        }
        this.apiDefinitions.set(api.id, api);
        this.notifyChange();
        return api;
    }
    
    /**
     * Remove API definition
     */
    remove(apiId: string): boolean {
        const result = this.apiDefinitions.delete(apiId);
        if (result) {
            this.notifyChange();
        }
        return result;
    }
    
    /**
     * Get all API definitions
     */
    getAll(): ApiDefinition[] {
        return Array.from(this.apiDefinitions.values());
    }
    
    /**
     * Get specific API definition
     */
    get(apiId: string): ApiDefinition | undefined {
        return this.apiDefinitions.get(apiId);
    }
    
    /**
     * Clear all API definitions
     */
    clear(): void {
        this.apiDefinitions.clear();
        this.notifyChange();
    }
    
    /**
     * Subscribe to changes
     */
    onChange(callback: (apis: ApiDefinition[]) => void): void {
        this.callbacks.add(callback);
    }
    
    /**
     * Unsubscribe from changes
     */
    offChange(callback: (apis: ApiDefinition[]) => void): void {
        this.callbacks.delete(callback);
    }
    
    /**
     * Notify subscribers of changes
     */
    private notifyChange(): void {
        const apis = this.getAll();
        this.callbacks.forEach(cb => cb(apis));
    }
    
    /**
     * Export API definitions as JSON
     */
    export(): string {
        const apis = this.getAll().map(api => ({
            id: api.id,
            name: api.name,
            source: api.source
        }));
        return JSON.stringify(apis, null, 2);
    }
    
    /**
     * Import API definitions from saved data
     */
    async import(data: string): Promise<void> {
        try {
            const apis = JSON.parse(data);
            const promises = apis.map((api: any) => 
                api.source ? this.loadFromUrl(api.source) : null
            ).filter((p: any) => p !== null);
            
            await Promise.all(promises);
        } catch (error) {
            throw new Error(`Failed to import APIs: ${error}`);
        }
    }
}

