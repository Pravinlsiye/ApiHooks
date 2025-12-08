/**
 * Designer configuration and modes
 */

export interface DesignerConfig {
    /**
     * Designer mode
     * - 'standalone': Independent website, no pre-loaded APIs
     * - 'embedded': Embedded in host app, may have pre-loaded APIs
     */
    mode: 'standalone' | 'embedded';
    
    /**
     * Base path for API calls (used in embedded mode)
     */
    apiBasePath?: string;
    
    /**
     * Pre-loaded API definitions (used in embedded mode)
     * These APIs are locked and cannot be removed
     */
    hostApis?: HostApiConfig[];
    
    /**
     * Features to enable/disable
     */
    features?: {
        workflows?: boolean;
        apis?: boolean;
        debug?: boolean;
    };
}

export interface HostApiConfig {
    /**
     * Name of the API (e.g., "Application API")
     */
    name: string;
    
    /**
     * Version string
     */
    version?: string;
    
    /**
     * URL to the OpenAPI/Swagger definition
     */
    swaggerUrl: string;
    
    /**
     * Locked APIs cannot be removed by the user
     */
    locked: true;
}

/**
 * Default configuration for standalone mode
 */
export const DEFAULT_CONFIG: DesignerConfig = {
    mode: 'standalone',
    features: {
        workflows: true,
        apis: true,
        debug: true
    }
};

/**
 * Create embedded mode configuration
 */
export function createEmbeddedConfig(
    apiBasePath: string,
    hostApis?: HostApiConfig[]
): DesignerConfig {
    return {
        mode: 'embedded',
        apiBasePath,
        hostApis: hostApis || [],
        features: {
            workflows: true,
            apis: true,
            debug: false // Usually disabled in embedded mode
        }
    };
}

