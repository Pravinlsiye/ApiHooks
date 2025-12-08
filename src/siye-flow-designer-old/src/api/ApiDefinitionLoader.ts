/**
 * API Definition Loader
 * Loads and parses OpenAPI/Swagger definitions
 */

export interface ApiEndpoint {
    id: string;
    name: string;
    method: string;
    path: string;
    summary?: string;
    description?: string;
    parameters?: ApiParameter[];
    requestBody?: any;
    responses?: any;
}

export interface ApiParameter {
    name: string;
    in: string; // 'query', 'path', 'header', 'body'
    required?: boolean;
    type?: string;
    description?: string;
}

export interface ApiDefinition {
    id: string;
    name: string;
    version: string;
    baseUrl: string;
    endpoints: ApiEndpoint[];
    source?: string; // URL where it was loaded from
}

export class ApiDefinitionLoader {
    /**
     * Load API definition from URL
     */
    static async loadFromUrl(url: string): Promise<ApiDefinition> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load API definition: ${response.statusText}`);
        }
        
        const json = await response.json();
        return this.parseOpenApi(json, url);
    }
    
    /**
     * Parse OpenAPI/Swagger JSON
     */
    static parseOpenApi(spec: any, source?: string): ApiDefinition {
        const isOpenApi3 = spec.openapi?.startsWith('3');
        const isSwagger2 = spec.swagger?.startsWith('2');
        
        if (!isOpenApi3 && !isSwagger2) {
            throw new Error('Unsupported API definition format');
        }
        
        const info = spec.info || {};
        const paths = spec.paths || {};
        const servers = spec.servers || [];
        
        // Get base URL
        const baseUrl = servers.length > 0 
            ? servers[0].url 
            : (spec.host ? `${spec.schemes?.[0] || 'http'}://${spec.host}${spec.basePath || ''}` : '');
        
        // Parse endpoints
        const endpoints: ApiEndpoint[] = [];
        
        for (const [path, pathItem] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(pathItem as any)) {
                if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                    const op = operation as any;
                    
                    endpoints.push({
                        id: `${method}_${path.replace(/\//g, '_')}`,
                        name: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
                        method: method.toUpperCase(),
                        path,
                        summary: op.summary,
                        description: op.description,
                        parameters: this.parseParameters(op.parameters || []),
                        requestBody: op.requestBody,
                        responses: op.responses
                    });
                }
            }
        }
        
        return {
            id: this.generateId(info.title),
            name: info.title || 'API',
            version: info.version || '1.0',
            baseUrl,
            endpoints,
            source
        };
    }
    
    /**
     * Parse parameters from OpenAPI
     */
    private static parseParameters(params: any[]): ApiParameter[] {
        return params.map(p => ({
            name: p.name,
            in: p.in,
            required: p.required,
            type: p.schema?.type || p.type,
            description: p.description
        }));
    }
    
    /**
     * Generate ID from name
     */
    private static generateId(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    }
}

