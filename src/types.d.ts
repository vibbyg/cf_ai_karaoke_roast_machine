// Complete type definitions for our Cloudflare Workers project

// Environment interface matching our wrangler.toml
interface Env {
  AI: {
    run(model: string, options: any): Promise<any>;
  };
  USER_STATE: DurableObjectNamespace;
  AUDIO_WORKFLOW: WorkflowBinding;
}

// Workflow types
interface WorkflowBinding {
  create(options: { params: any; id?: string }): Promise<WorkflowInstance>;
  get(id: string): Promise<WorkflowInstance>;
}

interface WorkflowInstance {
  id: string;
  status(): Promise<{
    status: 'running' | 'complete' | 'paused' | 'terminated' | 'errored' | 'queued';
    output?: any;
    error?: any;
  }>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  terminate(): Promise<void>;
  sendEvent(event: { type: string; payload?: any }): Promise<void>;
}

// Durable Object types
interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
}

interface DurableObjectStub {
  // Our custom RPC methods
  initializeUser(userId: string): Promise<{ success: boolean; session?: any }>;
  getStats(): Promise<{
    totalAttempts: number;
    currentStreak: number;
    favoriteVictimSong: string;
    roastIntensity: string;
    recentRoasts: any[];
    songBreakdown: Record<string, number>;
    averageAccuracy: number;
    memberSince: string;
  }>;
  updateIntensity(intensity: string): Promise<{ success: boolean; intensity: string }>;
  recordAttempt(data: {
    song: string;
    accuracy: number;
    confidence: number;
    roast: string;
    roastStyle: string;
    intensity: string;
    transcription: string;
  }): Promise<{ success: boolean; session: any }>;
  getEscalationContext(songName: string): Promise<{
    songAttempts: number;
    totalAttempts: number;
    recentRoasts: string[];
    intensity: string;
  }>;
  
  // Standard DO methods
  fetch(request: Request): Promise<Response>;
}

// Durable Object State
interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
  waitUntil(promise: Promise<any>): void;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put<T>(key: string, value: T): Promise<void>;
  put<T>(entries: Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  deleteAll(): Promise<void>;
  list<T = unknown>(options?: {
    start?: string;
    startAfter?: string;
    end?: string;
    prefix?: string;
    reverse?: boolean;
    limit?: number;
  }): Promise<Map<string, T>>;
}


export { Env, WorkflowBinding, WorkflowInstance, DurableObjectNamespace, DurableObjectStub, DurableObjectState, DurableObjectStorage };