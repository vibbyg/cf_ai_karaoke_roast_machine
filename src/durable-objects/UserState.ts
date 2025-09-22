import { DurableObject } from "cloudflare:workers";

export interface UserSession {
  userId: string;
  totalAttempts: number;
  songAttempts: Record<string, number>; // song -> attempt count
  roastHistory: RoastEntry[];
  currentStreak: number;
  roastIntensity: 'friendly' | 'medium' | 'savage' | 'gordon-ramsay';
  lastAttemptTime: number;
  createdAt: number;
  favoriteVictimSong?: string;
}

export interface RoastEntry {
  id: string;
  song: string;
  accuracy: number;
  confidence: number;
  roast: string;
  roastStyle: string;
  timestamp: number;
  intensity: string;
  transcription: string;
}

export class UserState extends DurableObject {
  private session: UserSession | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  // RPC methods (available as of 2024-04-03 compatibility date)
  async initializeUser(userId: string): Promise<{ success: boolean; session: UserSession }> {
    if (!this.session) {
      await this.loadSession();
    }

    if (!this.session) {
      const now = Date.now();
      this.session = {
        userId,
        totalAttempts: 0,
        songAttempts: {},
        roastHistory: [],
        currentStreak: 0,
        roastIntensity: 'medium',
        lastAttemptTime: 0,
        createdAt: now
      };
      await this.saveSession();
    }

    return { success: true, session: this.session };
  }

  async getSession(): Promise<{ session: UserSession | null }> {
    if (!this.session) {
      await this.loadSession();
    }
    return { session: this.session };
  }

  async recordAttempt(roastData: {
    song: string;
    accuracy: number;
    confidence: number;
    roast: string;
    roastStyle: string;
    intensity: string;
    transcription: string;
  }): Promise<{ success: boolean; session: UserSession; roastEntry: RoastEntry }> {
    if (!this.session) {
      await this.loadSession();
      if (!this.session) {
        throw new Error('Session not initialized');
      }
    }

    const now = Date.now();
    const roastEntry: RoastEntry = {
      id: crypto.randomUUID(),
      song: roastData.song,
      accuracy: roastData.accuracy,
      confidence: roastData.confidence,
      roast: roastData.roast,
      roastStyle: roastData.roastStyle,
      timestamp: now,
      intensity: roastData.intensity,
      transcription: roastData.transcription
    };

    // Update session data
    this.session.totalAttempts += 1;
    this.session.songAttempts[roastData.song] = (this.session.songAttempts[roastData.song] || 0) + 1;
    this.session.roastHistory.push(roastEntry);
    this.session.lastAttemptTime = now;

    // Keep only last 50 roast entries to prevent unlimited growth
    if (this.session.roastHistory.length > 50) {
      this.session.roastHistory = this.session.roastHistory.slice(-50);
    }

    // Update current streak
    const timeSinceLastAttempt = now - this.session.lastAttemptTime;
    if (timeSinceLastAttempt < 3600000) { // Within 1 hour
      this.session.currentStreak += 1;
    } else {
      this.session.currentStreak = 1;
    }

    // Update favorite victim song
    this.session.favoriteVictimSong = this.getMostAttemptedSong();

    await this.saveSession();

    return { success: true, session: this.session, roastEntry };
  }

  async updateIntensity(intensity: UserSession['roastIntensity']): Promise<{ success: boolean; intensity: string }> {
    if (!this.session) {
      await this.loadSession();
      if (!this.session) {
        throw new Error('Session not initialized');
      }
    }

    this.session.roastIntensity = intensity;
    await this.saveSession();

    return { success: true, intensity: this.session.roastIntensity };
  }

  async getStats(): Promise<{
    totalAttempts: number;
    currentStreak: number;
    favoriteVictimSong: string;
    roastIntensity: string;
    recentRoasts: RoastEntry[];
    songBreakdown: Record<string, number>;
    averageAccuracy: number;
    memberSince: string;
  }> {
    if (!this.session) {
      await this.loadSession();
    }

    if (!this.session) {
      return {
        totalAttempts: 0,
        currentStreak: 0,
        favoriteVictimSong: 'None yet',
        roastIntensity: 'medium',
        recentRoasts: [],
        songBreakdown: {},
        averageAccuracy: 0,
        memberSince: new Date().toLocaleDateString()
      };
    }

    return {
      totalAttempts: this.session.totalAttempts,
      currentStreak: this.session.currentStreak,
      favoriteVictimSong: this.session.favoriteVictimSong || 'None yet',
      roastIntensity: this.session.roastIntensity,
      recentRoasts: this.session.roastHistory.slice(-5),
      songBreakdown: this.session.songAttempts,
      averageAccuracy: this.calculateAverageAccuracy(),
      memberSince: new Date(this.session.createdAt).toLocaleDateString()
    };
  }

  async resetSession(): Promise<{ success: boolean; message: string }> {
    await this.ctx.storage.deleteAll();
    this.session = null;
    return { success: true, message: 'Session reset successfully' };
  }

  // Get escalation context for roast generation
  async getEscalationContext(songName: string): Promise<{
    songAttempts: number;
    totalAttempts: number;
    recentRoasts: string[];
    intensity: string;
  }> {
    if (!this.session) {
      await this.loadSession();
    }

    if (!this.session) {
      return {
        songAttempts: 0,
        totalAttempts: 0,
        recentRoasts: [],
        intensity: 'medium'
      };
    }

    return {
      songAttempts: this.session.songAttempts[songName] || 0,
      totalAttempts: this.session.totalAttempts,
      recentRoasts: this.session.roastHistory.slice(-3).map(entry => entry.roast),
      intensity: this.session.roastIntensity
    };
  }

  private async loadSession(): Promise<void> {
    const stored = await this.ctx.storage.get<UserSession>('session');
    if (stored) {
      this.session = stored;
    }
  }

  private async saveSession(): Promise<void> {
    if (this.session) {
      await this.ctx.storage.put('session', this.session);
    }
  }

  private getMostAttemptedSong(): string {
    if (!this.session) return 'None yet';
    
    let maxAttempts = 0;
    let mostAttempted = 'None yet';
    
    for (const [song, attempts] of Object.entries(this.session.songAttempts)) {
      if (attempts > maxAttempts) {
        maxAttempts = attempts;
        mostAttempted = song;
      }
    }
    
    return maxAttempts > 0 ? `${mostAttempted} (${maxAttempts} attempts)` : 'None yet';
  }

  private calculateAverageAccuracy(): number {
    if (!this.session || this.session.roastHistory.length === 0) return 0;
    
    const totalAccuracy = this.session.roastHistory.reduce((sum, entry) => sum + entry.accuracy, 0);
    return Math.round((totalAccuracy / this.session.roastHistory.length) * 100);
  }
}

export interface Env {
  AI: any;
  USER_STATE: DurableObjectNamespace;
}