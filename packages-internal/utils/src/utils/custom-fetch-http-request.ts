import { FetchHttpRequest, type OpenAPIConfig, type ApiRequestOptions, CancelablePromise } from '@avalabs/glacier-sdk';

// Extend OpenAPIConfig to support global query params
export interface CustomOpenAPIConfig extends OpenAPIConfig {
  GLOBAL_QUERY_PARAMS?: Record<string, unknown>;
}

// Custom HttpRequest class to inject global query parameters
export class CustomFetchHttpRequest extends FetchHttpRequest {
  private globalQueryParams: Record<string, unknown> | undefined;

  constructor(config: CustomOpenAPIConfig) {
    super(config);
    this.globalQueryParams = config.GLOBAL_QUERY_PARAMS;
  }

  public override request<T>(options: ApiRequestOptions): CancelablePromise<T> {
    // Merge global query parameters with request-specific ones
    const mergedQuery = {
      ...(this.globalQueryParams || {}), // Global params
      ...(options.query || {}), // Request-specific params (override globals if same key)
    };
    // eslint-disable-next-line no-console
    console.log('mergedQuery', mergedQuery);
    // Create modified options with merged query
    const modifiedOptions: ApiRequestOptions = {
      ...options,
      query: Object.keys(mergedQuery).length > 0 ? mergedQuery : undefined,
    };
    // eslint-disable-next-line no-console
    console.log('modifiedOptions', modifiedOptions);
    // Call the base class's request method
    return super.request<T>(modifiedOptions);
  }
}
