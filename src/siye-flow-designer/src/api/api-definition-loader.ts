/**
 * API Definition Loader
 * Loads and parses OpenAPI/Swagger definitions
 */

export interface ApiEndpoint {
    id: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    summary?: string;
    description?: string;
    parameters?: ApiParameter[];
    requestBody?: any;
    responses?: any;
    tags?: string[];
}

export interface ApiParameter {
    name: string;
    in: 'query' | 'path' | 'header' | 'body' | 'cookie';
    required?: boolean;
    type?: string;
    description?: string;
    schema?: any;
}

export interface ApiDefinition {
    id: string;
    name: string;
    version: string;
    baseUrl: string;
    description?: string;
    endpoints: ApiEndpoint[];
    source?: string; // URL where it was loaded from
    tags?: string[];
}

export class ApiDefinitionLoader {
    /**
     * Load API definition from URL
     * Note: External URLs may fail due to CORS restrictions.
     * For external APIs, download the spec file and use loadFromFile instead.
     */
    static async loadFromUrl(url: string): Promise<ApiDefinition> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const json = await response.json();
            return this.parseOpenApi(json, url);
        } catch (error) {
            // Check for CORS/network errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(
                    `CORS Error: Cannot load from "${url}".\n\n` +
                    `External APIs often block browser requests. Try:\n` +
                    `• Download the OpenAPI/Swagger JSON file\n` +
                    `• Use the file upload button to load it`
                );
            }
            throw error;
        }
    }
    
    /**
     * Load API definition from file
     */
    static async loadFromFile(file: File): Promise<ApiDefinition> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    resolve(this.parseOpenApi(json, file.name));
                } catch (error) {
                    reject(new Error(`Failed to parse API definition: ${error}`));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Parse OpenAPI/Swagger JSON
     */
    static parseOpenApi(spec: any, source?: string): ApiDefinition {
        const isOpenApi3 = spec.openapi?.startsWith('3');
        const isSwagger2 = spec.swagger?.startsWith('2');
        
        if (!isOpenApi3 && !isSwagger2) {
            throw new Error('Unsupported API definition format. Expected OpenAPI 3.x or Swagger 2.x');
        }
        
        const info = spec.info || {};
        const paths = spec.paths || {};
        const servers = spec.servers || [];
        const tags = spec.tags?.map((t: any) => t.name) || [];
        
        // Get base URL
        let baseUrl = '';
        if (servers.length > 0) {
            baseUrl = servers[0].url;
        } else if (spec.host) {
            const scheme = spec.schemes?.[0] || 'https';
            baseUrl = `${scheme}://${spec.host}${spec.basePath || ''}`;
        }
        
        // Parse endpoints
        const endpoints: ApiEndpoint[] = [];
        const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
        
        for (const [path, pathItem] of Object.entries(paths)) {
            for (const method of methods) {
                const operation = (pathItem as any)[method];
                if (operation) {
                    endpoints.push({
                        id: this.generateEndpointId(method, path),
                        name: operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
                        method: method.toUpperCase() as ApiEndpoint['method'],
                        path,
                        summary: operation.summary,
                        description: operation.description,
                        parameters: this.parseParameters(operation.parameters || [], isOpenApi3),
                        requestBody: operation.requestBody,
                        responses: operation.responses,
                        tags: operation.tags
                    });
                }
            }
        }
        
        return {
            id: this.generateId(info.title || 'api'),
            name: info.title || 'API',
            version: info.version || '1.0.0',
            description: info.description,
            baseUrl,
            endpoints,
            source,
            tags
        };
    }
    
    /**
     * Parse parameters from OpenAPI
     */
    private static parseParameters(params: any[], isOpenApi3: boolean): ApiParameter[] {
        return params.map(p => ({
            name: p.name,
            in: p.in,
            required: p.required ?? false,
            type: isOpenApi3 ? p.schema?.type : p.type,
            description: p.description,
            schema: p.schema
        }));
    }
    
    /**
     * Generate endpoint ID from method and path
     */
    private static generateEndpointId(method: string, path: string): string {
        const cleanPath = path
            .replace(/\{([^}]+)\}/g, '_$1_') // Replace {param} with _param_
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
        return `${method}_${cleanPath}`.toLowerCase();
    }
    
    /**
     * Generate ID from name
     */
    private static generateId(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '') || 
            `api_${Date.now()}`;
    }
    
    /**
     * Validate if JSON is a valid OpenAPI/Swagger spec
     */
    static isValidSpec(json: any): boolean {
        return !!(json.openapi?.startsWith('3') || json.swagger?.startsWith('2'));
    }
}

