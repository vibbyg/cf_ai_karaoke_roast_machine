import type { Env } from '../types';

// Minimal local workflow type definitions for build-time
export interface WorkflowEvent<T = any> {
  payload: T;
  timestamp?: Date;
}

export interface WorkflowStep {
  do<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
  sleep?(duration: number): Promise<void>;
  sleepUntil?(timestamp: Date): Promise<void>;
}

export abstract class WorkflowEntrypoint<EnvT = any, Params = any> {
  public env: EnvT;
  constructor(env: EnvT) {
    this.env = env;
  }
  abstract run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<any>;
}

export interface AudioProcessingInput {
  audioData: number[];
  userId: string;
  intensity: string;
  sessionId: string;
}

export interface TranscriptionResult {
  text: string;
  success: boolean;
  error?: string;
}

export interface AnalysisResult {
  detectedSong: string;
  confidence: number;
  accuracy: number;
  success: boolean;
  error?: string;
}

export interface RoastResult {
  text: string;
  style: string;
  intensity: string;
  success: boolean;
  error?: string;
}

export interface ProcessingResult {
  transcription: TranscriptionResult;
  analysis: AnalysisResult;
  roast: RoastResult;
  userStats?: any;
  processingTimeMs: number;
  success: boolean;
}

export class AudioProcessingWorkflow extends WorkflowEntrypoint<Env, AudioProcessingInput> {
  
  constructor(env: Env) {
    super(env);
  }
  
  async run(event: WorkflowEvent<AudioProcessingInput>, step: WorkflowStep): Promise<ProcessingResult> {
    const startTime = Date.now();
    const { audioData, userId, intensity, sessionId } = event.payload;
    
    console.log('Workflow started for user:', userId);
    
    // Step 1: Initialize user state
    await step.do("initialize-user-state", async () => {
      console.log('Initializing user state...');
      const userStateStub = this.env.USER_STATE.idFromName(userId);
      const userState = this.env.USER_STATE.get(userStateStub);
      
      // Initialize user if needed using RPC
      await userState.initializeUser(userId);
      console.log('User state initialized');
      
      return true;
    });

    // Step 2: Transcribe audio using Whisper
    const transcription = await step.do("transcribe-audio", async (): Promise<TranscriptionResult> => {
      try {
        console.log('Starting transcription...');
        
        const response = await this.env.AI.run('@cf/openai/whisper', {
          audio: audioData
        });
        
        const text = response.text || '';
        console.log('Transcription result:', text);
        
        return {
          text,
          success: true
        };
      } catch (error) {
        console.error('Transcription failed:', error);
        return {
          text: '',
          success: false,
          error: (error as any)?.message || String(error)
        };
      }
    });

    // Step 3: Analyze transcription and identify song
    const analysis = await step.do("analyze-song", async (): Promise<AnalysisResult> => {
      if (!transcription.success || !transcription.text.trim()) {
        return {
          detectedSong: 'Silent Treatment',
          confidence: 0.1,
          accuracy: 0.0,
          success: false,
          error: 'No transcription available'
        };
      }

      try {
        console.log('Analyzing song...');
        
        const analysisPrompt = `Identify this song from lyrics: "${transcription.text}". 
        Respond with valid JSON: {"detectedSong": "Title by Artist", "confidence": 0.85, "accuracy": 0.72}`;
        
        const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            { role: 'system', content: 'You are a song identification expert. Respond only with valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ]
        });
        
        console.log('Analysis response:', response.response);
        
        let analysisData;
        try {
          analysisData = JSON.parse(response.response);
        } catch (parseError) {
          // Try to extract JSON from response
          const jsonMatch = response.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
        
        return {
          detectedSong: analysisData.detectedSong || 'Mystery Song',
          confidence: Math.max(0, Math.min(1, analysisData.confidence || 0.1)),
          accuracy: Math.max(0, Math.min(1, analysisData.accuracy || 0.1)),
          success: true
        };
        
      } catch (error) {
        console.error('Analysis failed:', error);
        return {
          detectedSong: 'Mysterious Melody',
          confidence: 0.1,
          accuracy: 0.1,
          success: false,
          error: (error as any)?.message || String(error)
        };
      }
    });

    // Step 4: Generate roast
    const roast = await step.do("generate-roast", async (): Promise<RoastResult> => {
      try {
        console.log('Generating roast...');
        
        const roastPrompt = `Generate a funny, savage but good-natured roast for someone who sang "${analysis.detectedSong}" with ${Math.round(analysis.accuracy * 100)}% accuracy. 
        Make it witty and entertaining, maximum 2 sentences. Be creative and reference current internet culture.`;

        const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            { role: 'system', content: 'You are a hilarious karaoke roast master. Be savage but fun.' },
            { role: 'user', content: roastPrompt }
          ]
        });

        return {
          text: response.response,
          style: 'ai-generated',
          intensity: intensity,
          success: true
        };
        
      } catch (error) {
        console.error('Roast generation failed:', error);
        
        const fallbackRoasts = [
          "Your singing was so unique, even AI couldn't process it. That's actually impressive in a terrifying way! 🤖",
          "I've heard better pitch control from a broken GPS. But hey, at least you're confident! 🎵",
          "That performance had more plot twists than a soap opera. Bravo for keeping us guessing! 🎭"
        ];
        
        return {
          text: fallbackRoasts[Math.floor(Math.random() * fallbackRoasts.length)],
          style: 'fallback',
          intensity: intensity,
          success: false,
          error: (error as any)?.message || String(error)
        };
      }
    });

    // Step 5: Record attempt in user state
    const userStats = await step.do("record-attempt", async () => {
      console.log('Recording attempt...');
      
      const userStateStub = this.env.USER_STATE.idFromName(userId);
      const userState = this.env.USER_STATE.get(userStateStub);
      
      // Record attempt using RPC
      const result = await userState.recordAttempt({
        song: analysis.detectedSong,
        accuracy: analysis.accuracy,
        confidence: analysis.confidence,
        roast: roast.text,
        roastStyle: roast.style,
        intensity: roast.intensity,
        transcription: transcription.text
      });
      
      console.log('Attempt recorded');
      return result.session;
    });

    const processingTimeMs = Date.now() - startTime;
    console.log('Workflow completed in', processingTimeMs, 'ms');
    
    return {
      transcription,
      analysis,
      roast,
      userStats,
      processingTimeMs,
      success: transcription.success && analysis.success && roast.success
    };
  }
}