/**
 * API Definition Manager
 * Manages loaded API definitions and provides them to the palette
 */

import { ApiDefinition, ApiDefinitionLoader, ApiEndpoint } from './api-definition-loader';

export type ApiChangeCallback = (apis: ApiDefinition[]) => void;

export class ApiDefinitionManager {
    private apiDefinitions: Map<string, ApiDefinition> = new Map();
    private callbacks: Set<ApiChangeCallback> = new Set();
    private static readonly STORAGE_KEY = 'siyeflow-api-definitions';
    
    /**
     * Load API definition from URL
     */
    async loadFromUrl(url: string, options?: { locked?: boolean }): Promise<ApiDefinition> {
        try {
            const api = await ApiDefinitionLoader.loadFromUrl(url);
            if (options?.locked) api.locked = true;
            this.apiDefinitions.set(api.id, api);
            this.notifyChange();
            if (!api.locked) this.saveToStorage();
            return api;
        } catch (error) {
            throw new Error(`Failed to load API from ${url}: ${error}`);
        }
    }
    
    /**
     * Load API definition from file
     */
    async loadFromFile(file: File): Promise<ApiDefinition> {
        try {
            const api = await ApiDefinitionLoader.loadFromFile(file);
            this.apiDefinitions.set(api.id, api);
            this.notifyChange();
            this.saveToStorage();
            return api;
        } catch (error) {
            throw new Error(`Failed to load API from file: ${error}`);
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
        this.saveToStorage();
        return api;
    }
    
    /**
     * Remove API definition
     */
    remove(apiId: string): boolean {
        const result = this.apiDefinitions.delete(apiId);
        if (result) {
            this.notifyChange();
            this.saveToStorage();
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
     * Get all endpoints from all APIs
     */
    getAllEndpoints(): Array<ApiEndpoint & { apiId: string; apiName: string }> {
        const endpoints: Array<ApiEndpoint & { apiId: string; apiName: string }> = [];
        
        this.apiDefinitions.forEach(api => {
            api.endpoints.forEach(endpoint => {
                endpoints.push({
                    ...endpoint,
                    apiId: api.id,
                    apiName: api.name
                });
            });
        });
        
        return endpoints;
    }
    
    /**
     * Search endpoints by name or path
     */
    searchEndpoints(query: string): Array<ApiEndpoint & { apiId: string; apiName: string }> {
        const lowerQuery = query.toLowerCase();
        return this.getAllEndpoints().filter(endpoint => 
            endpoint.name.toLowerCase().includes(lowerQuery) ||
            endpoint.path.toLowerCase().includes(lowerQuery) ||
            endpoint.summary?.toLowerCase().includes(lowerQuery)
        );
    }
    
    /**
     * Clear all API definitions
     */
    clear(): void {
        this.apiDefinitions.clear();
        this.notifyChange();
        this.saveToStorage();
    }
    
    /**
     * Subscribe to changes
     */
    onChange(callback: ApiChangeCallback): () => void {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }
    
    /**
     * Notify subscribers of changes
     */
    private notifyChange(): void {
        const apis = this.getAll();
        this.callbacks.forEach(cb => {
            try {
                cb(apis);
            } catch (error) {
                console.error('Error in API change callback:', error);
            }
        });
    }
    
    /**
     * Save API sources to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = this.getAll()
                .filter(api => api.source)
                .map(api => ({
                    id: api.id,
                    name: api.name,
                    source: api.source
                }));
            localStorage.setItem(ApiDefinitionManager.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save API definitions to storage:', error);
        }
    }
    
    /**
     * Load API sources from localStorage
     */
    async loadFromStorage(): Promise<void> {
        try {
            const data = localStorage.getItem(ApiDefinitionManager.STORAGE_KEY);
            if (data) {
                const apis = JSON.parse(data);
                const validApis = apis.filter((api: any) => api.source);
                
                // Load each API silently, tracking which ones succeed
                const results = await Promise.all(
                    validApis.map(async (api: any) => {
                        try {
                            await this.loadFromUrl(api.source);
                            return { success: true, api };
                        } catch {
                            // Silently skip failed APIs
                            return { success: false, api };
                        }
                    })
                );
                
                // If any failed, clean up storage to only keep successful ones
                const failedCount = results.filter(r => !r.success).length;
                if (failedCount > 0) {
                    this.saveToStorage(); // Re-save with only successful APIs
                }
            }
        } catch {
            // Clear corrupted storage
            localStorage.removeItem(ApiDefinitionManager.STORAGE_KEY);
        }
    }
    
    /**
     * Export API definitions as JSON
     */
    exportConfig(): string {
        const apis = this.getAll().map(api => ({
            id: api.id,
            name: api.name,
            source: api.source,
            baseUrl: api.baseUrl
        }));
        return JSON.stringify(apis, null, 2);
    }
    
    /**
     * Get count of loaded APIs
     */
    get count(): number {
        return this.apiDefinitions.size;
    }
    
    /**
     * Check if any APIs are loaded
     */
    get hasApis(): boolean {
        return this.apiDefinitions.size > 0;
    }
}

// Singleton instance for app-wide usage
export const apiManager = new ApiDefinitionManager();

