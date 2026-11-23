import {
  ApiError,
  type ApiRequestOptions,
  CancelablePromise,
  FetchHttpRequest,
  type OpenAPIConfig,
} from '@avalabs/glacier-sdk';
import { RetryBackoffPolicy } from './retry';

/**
 * Glacier HTTP client that postpones requests with exponential backoff after
 * rate-limit (429) or server (5xx) errors.
 */
export class GlacierFetchHttpRequest extends FetchHttpRequest {
  #failedRequests = 0;
  #getDelay = RetryBackoffPolicy.exponential();

  constructor(config: OpenAPIConfig) {
    super(config);
  }

  public override request<T>(options: ApiRequestOptions): CancelablePromise<T> {
    const getRequest = () => super.request<T>(options);
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
