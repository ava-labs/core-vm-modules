import {
  ApiError,
  type ApiRequestOptions,
  CancelablePromise,
  FetchHttpRequest,
  type OpenAPIConfig,
} from '@avalabs/glacier-sdk';
import { getGlacierApiKey } from './get-glacier-api-key';
import { RetryBackoffPolicy } from './retry';

const GLOBAL_QUERY_PARAMS: Record<string, string | undefined> = {
  rltoken: getGlacierApiKey(),
};

/**
 * Custom HTTP request handler that automatically appends the Glacier API key (if present)
 * to bypass rate limits in development environments.
 */
export class GlacierFetchHttpRequest extends FetchHttpRequest {
  #failedRequests = 0;
  #getDelay = RetryBackoffPolicy.exponential();

  constructor(config: OpenAPIConfig) {
    super(config);
  }

  public override request<T>(options: ApiRequestOptions): CancelablePromise<T> {
    // Merge global query parameters with request-specific ones
    const mergedQuery = {
      ...GLOBAL_QUERY_PARAMS,
      ...(options.query || {}), // Request-specific params (override globals if same key)
    };

    // Create modified options with merged query
    const modifiedOptions: ApiRequestOptions = {
      ...options,
      query: Object.keys(mergedQuery).length > 0 ? mergedQuery : undefined,
    };

    const getRequest = () => super.request<T>(modifiedOptions);
    return this.#failedRequests > 0 ? this.#postponeRequest<T>(getRequest) : this.#request<T>(getRequest);
  }

  #request<T>(getRequest: () => CancelablePromise<T>): CancelablePromise<T> {
    const inner = getRequest();
    return new CancelablePromise((resolve, reject, onCancel) => {
      onCancel(() => inner.cancel());
      inner
        .then((response) => {
          this.#failedRequests = 0;
          resolve(response);
        })
        .catch((err) => {
          if (err instanceof ApiError) {
            const isHttpTooManyRequests = err.status === 429;
            const isHttpInternalServerError = err.status >= 500 && err.status < 600;
            this.#failedRequests += Number(isHttpTooManyRequests || isHttpInternalServerError);
          }
          reject(err);
        });
    });
  }

  #postponeRequest<T>(getRequest: () => CancelablePromise<T>): CancelablePromise<T> {
    const delay = this.#getDelay(this.#failedRequests);
    return new CancelablePromise<T>((resolve, reject, onCancel) => {
      const timeout = setTimeout(() => {
        const inner = getRequest();
        onCancel(() => {
          inner.cancel();
          clearTimeout(timeout);
        });
        inner.then(resolve).catch(reject);
      }, delay);
    });
  }
}
