/**
 * Audio processing utilities
 */

export class AudioProcessor {
  /**
   * Convert audio file to array format for Workers AI
   */
  static async fileToArray(audioFile: File): Promise<number[]> {
    const arrayBuffer = await audioFile.arrayBuffer();
    return [...new Uint8Array(arrayBuffer)];
  }

  /**
   * Validate audio file format and size
   */
  static validateAudioFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'Audio file too large (max 10MB)' };
    }
    
    if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
      return { valid: false, error: 'Unsupported audio format' };
    }
    
    return { valid: true };
  }

  /**
   * Estimate audio duration from file size (rough approximation)
   */
  static estimateDuration(file: File): number {
    // Rough estimate: WebM opus is ~32kbps, so 4KB per second
    return Math.round(file.size / 4000);
  }

  /**
   * Generate a unique session ID for tracking
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create CORS headers for audio endpoints
   */
  static getCorsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }
}