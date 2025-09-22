import { AudioProcessor } from './audio';

/**
 * Standardized response utilities
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  processingTimeMs?: number;
}

export class ResponseBuilder {
  /**
   * Create a successful API response
   */
  static success<T>(data: T, processingTimeMs?: number): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: Date.now(),
      ...(processingTimeMs && { processingTimeMs })
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...AudioProcessor.getCorsHeaders()
      }
    });
  }

  /**
   * Create an error API response
   */
  static error(error: string, status: number = 400): Response {
    const response: ApiResponse = {
      success: false,
      error,
      timestamp: Date.now()
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...AudioProcessor.getCorsHeaders()
      }
    });
  }

  /**
   * Create a CORS preflight response
   */
  static cors(): Response {
    return new Response(null, {
      headers: AudioProcessor.getCorsHeaders()
    });
  }

  /**
   * Create HTML response
   */
  static html(content: string): Response {
    return new Response(content, {
      headers: {
        'Content-Type': 'text/html',
        ...AudioProcessor.getCorsHeaders()
      }
    });
  }

  /**
   * Create a processing response with loading state
   */
  static processing(message: string = 'Processing...'): Response {
    const response: ApiResponse = {
      success: true,
      data: { status: 'processing', message },
      timestamp: Date.now()
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...AudioProcessor.getCorsHeaders()
      }
    });
  }
}