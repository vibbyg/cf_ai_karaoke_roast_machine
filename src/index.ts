import { AudioProcessingWorkflow } from './workflows/AudioProcessingWorkflow';
import { UserState } from './durable-objects/UserState';
import { AudioProcessor } from './utils/audio';
import { ResponseBuilder } from './utils/responses';
import { Env } from './types';

// Export Durable Object and Workflow classes
export { UserState };
export { AudioProcessingWorkflow };

// Embed the HTML directly for simplicity
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎤 AI Karaoke Roast Machine</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; color: white; overflow-x: hidden;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
        .header { margin-bottom: 40px; }
        .title { font-size: 3em; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
        .subtitle { font-size: 1.2em; opacity: 0.9; }
        .mic-container { position: relative; margin: 40px 0; }
        .mic-button {
            width: 200px; height: 200px; border-radius: 50%; border: none;
            background: linear-gradient(145deg, #ff6b6b, #ee5a24);
            color: white; font-size: 4em; cursor: pointer;
            transition: all 0.3s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .mic-button:hover { transform: scale(1.05); }
        .mic-button.recording { 
            background: linear-gradient(145deg, #ff4757, #c44569); 
            animation: pulse 1.5s infinite; 
        }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .controls { margin: 30px 0; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .intensity-selector, .stats-btn {
            background: rgba(255,255,255,0.2); border: none; color: white;
            padding: 10px 20px; border-radius: 25px; cursor: pointer; transition: all 0.3s ease;
        }
        .intensity-selector:hover, .stats-btn:hover { background: rgba(255,255,255,0.3); }
        .results-container {
            margin: 30px 0; min-height: 200px; background: rgba(255,255,255,0.1);
            border-radius: 15px; padding: 20px; backdrop-filter: blur(10px);
        }
        .roast-display {
            font-size: 1.3em; line-height: 1.6; margin: 20px 0; padding: 20px;
            background: rgba(255,255,255,0.15); border-radius: 10px; border-left: 4px solid #ff6b6b;
        }
        .song-info, .user-stats { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; 
        }
        .stat-card { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #ffa726; }
        .stat-label { font-size: 0.9em; opacity: 0.8; margin-top: 5px; }
        .status { margin: 10px 0; padding: 10px; border-radius: 5px; font-weight: bold; }
        .status.processing { background: rgba(255, 193, 7, 0.3); color: #ffc107; }
        .status.error { background: rgba(244, 67, 54, 0.3); color: #f44336; }
        .status.success { background: rgba(76, 175, 80, 0.3); color: #4caf50; }
        .stats-modal { 
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 1000;
        }
        .stats-content {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px; border-radius: 15px; max-width: 600px; width: 90%;
            max-height: 80vh; overflow-y: auto;
        }
        .close-btn { 
            position: absolute; top: 10px; right: 15px; background: none; border: none;
            color: white; font-size: 24px; cursor: pointer;
        }
        .workflow-status {
            background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin: 10px 0;
            border-left: 4px solid #ffa726;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🎤 AI Karaoke Roast Machine</h1>
            <p class="subtitle">Sing your heart out, get your feelings hurt</p>
            <p style="font-size: 0.9em; opacity: 0.7;">Now with memory & escalating roasts!</p>
        </div>

        <div class="controls">
            <select class="intensity-selector" id="intensitySelector">
                <option value="friendly">😊 Friendly Tease</option>
                <option value="medium" selected>😈 Medium Roast</option>
                <option value="savage">🔥 Savage Mode</option>
                <option value="gordon-ramsay">👹 Gordon Ramsay</option>
            </select>
            <button class="stats-btn" id="statsBtn">📊 My Stats</button>
        </div>

        <div class="mic-container">
            <button class="mic-button" id="micButton">🎤</button>
        </div>

        <div class="status" id="status" style="display: none;"></div>

        <div class="workflow-status" id="workflowStatus" style="display: none;">
            <h4>Processing Pipeline:</h4>
            <div id="workflowSteps"></div>
        </div>

        <div class="results-container" id="results">
            <h3>Ready to get roasted? Hit the mic!</h3>
            <p>Pro tip: The more you sing the same song, the more brutal I get 😈</p>
        </div>

        <div class="user-stats" id="userStatsDisplay" style="display: none;"></div>
    </div>

    <!-- Stats Modal -->
    <div class="stats-modal" id="statsModal">
        <div class="stats-content">
            <button class="close-btn" id="closeStats">&times;</button>
            <h2>🎭 Your Roast History</h2>
            <div id="statsContent"></div>
        </div>
    </div>

    <script>
        class KaraokeRoastMachine {
            constructor() {
                this.isRecording = false;
                this.mediaRecorder = null;
                this.audioChunks = [];
                this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
                this.workflowId = null;
                
                this.initializeElements();
                this.setupEventListeners();
                this.initializeUser();
            }

            initializeElements() {
                this.micButton = document.getElementById('micButton');
                this.status = document.getElementById('status');
                this.results = document.getElementById('results');
                this.intensitySelector = document.getElementById('intensitySelector');
                this.userStatsDisplay = document.getElementById('userStatsDisplay');
                this.statsBtn = document.getElementById('statsBtn');
                this.statsModal = document.getElementById('statsModal');
                this.closeStats = document.getElementById('closeStats');
                this.workflowStatus = document.getElementById('workflowStatus');
                this.workflowSteps = document.getElementById('workflowSteps');
            }

            setupEventListeners() {
                this.micButton.addEventListener('click', () => this.toggleRecording());
                this.intensitySelector.addEventListener('change', (e) => this.setIntensity(e.target.value));
                this.statsBtn.addEventListener('click', () => this.showStats());
                this.closeStats.addEventListener('click', () => this.hideStats());
                this.statsModal.addEventListener('click', (e) => {
                    if (e.target === this.statsModal) this.hideStats();
                });
            }

            async initializeUser() {
                try {
                    const response = await fetch('/api/user/init', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: this.userId })
                    });
                    
                    if (response.ok) {
                        this.showStatus('Connected! Ready to roast 🔥', 'success');
                        this.loadUserStats();
                    }
                } catch (error) {
                    console.error('Failed to initialize user:', error);
                    this.showStatus('Connection failed, but we can still roast!', 'error');
                }
            }

            async loadUserStats() {
                try {
                    const response = await fetch('/api/user/stats?' + new URLSearchParams({ userId: this.userId }));
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            this.updateStatsDisplay(result.data);
                        }
                    }
                } catch (error) {
                    console.error('Failed to load stats:', error);
                }
            }

            async toggleRecording() {
                if (!this.isRecording) {
                    await this.startRecording();
                } else {
                    await this.stopRecording();
                }
            }

            async startRecording() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: { 
                            echoCancellation: true, 
                            noiseSuppression: true, 
                            sampleRate: 16000 
                        } 
                    });
                    
                    const options = { mimeType: 'audio/webm;codecs=opus' };
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        options.mimeType = 'audio/webm';
                        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                            delete options.mimeType;
                        }
                    }
                    
                    this.mediaRecorder = new MediaRecorder(stream, options);
                    this.audioChunks = [];
                    
                    this.mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            this.audioChunks.push(event.data);
                        }
                    };
                    
                    this.mediaRecorder.onstop = () => this.processRecording();
                    this.mediaRecorder.start(1000);
                    this.isRecording = true;
                    
                    this.micButton.classList.add('recording');
                    this.micButton.textContent = '🛑';
                    this.showStatus('Recording... sing your heart out! 🎵', 'processing');
                    
                } catch (error) {
                    console.error('Error starting recording:', error);
                    this.showStatus('Microphone access denied! Enable mic and try again.', 'error');
                }
            }

            async stopRecording() {
                if (this.mediaRecorder && this.isRecording) {
                    this.mediaRecorder.stop();
                    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    this.isRecording = false;
                    this.micButton.classList.remove('recording');
                    this.micButton.textContent = '🎤';
                    this.showStatus('Processing through AI pipeline... 🤖', 'processing');
                }
            }

            async processRecording() {
                try {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');
                    formData.append('userId', this.userId);
                    formData.append('intensity', this.intensitySelector.value);
                    
                    this.showWorkflowStatus('Starting AI workflow...');
                    
                    const response = await fetch('/api/process-audio', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) throw new Error('Server error: ' + response.status);
                    
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error);
                    
                    this.displayResult(result.data);
                    this.loadUserStats(); // Refresh stats after new attempt
                    
                } catch (error) {
                    console.error('Error processing recording:', error);
                    this.showStatus('Processing failed: ' + error.message, 'error');
                    this.hideWorkflowStatus();
                }
            }

            async setIntensity(intensity) {
                try {
                    const response = await fetch('/api/user/intensity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: this.userId, intensity })
                    });
                    
                    if (response.ok) {
                        console.log('Intensity updated to:', intensity);
                    }
                } catch (error) {
                    console.error('Failed to update intensity:', error);
                }
            }

            showWorkflowStatus(message) {
                this.workflowStatus.style.display = 'block';
                this.workflowSteps.innerHTML = '<p>' + message + '</p>';
            }

            hideWorkflowStatus() {
                this.workflowStatus.style.display = 'none';
            }

            displayResult(data) {
                this.hideWorkflowStatus();
                this.showStatus('Roast complete! 🔥', 'success');
                
                const { transcription, analysis, roast, userStats, processingTimeMs } = data;
                
                this.results.innerHTML = 
                    '<div class="song-info">' +
                        '<div class="stat-card">' +
                            '<div class="stat-value">' + analysis.detectedSong + '</div>' +
                            '<div class="stat-label">Detected Song</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-value">' + Math.round(analysis.confidence * 100) + '%</div>' +
                            '<div class="stat-label">AI Confidence</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-value">' + Math.round(analysis.accuracy * 100) + '%</div>' +
                            '<div class="stat-label">Your Accuracy</div>' +
                        '</div>' +
                        '<div class="stat-card">' +
                            '<div class="stat-value">' + processingTimeMs + 'ms</div>' +
                            '<div class="stat-label">Processing Time</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="roast-display">' + roast.text + '</div>' +
                    '<p style="opacity: 0.7; font-size: 0.9em;">Style: ' + roast.style + ' | Intensity: ' + roast.intensity + '</p>';
                
                if (userStats) {
                    this.updateStatsDisplay(userStats);
                }
                
                setTimeout(() => this.status.style.display = 'none', 3000);
            }

            updateStatsDisplay(stats) {
                this.userStatsDisplay.innerHTML = 
                    '<div class="stat-card">' +
                        '<div class="stat-value">' + stats.totalAttempts + '</div>' +
                        '<div class="stat-label">Total Attempts</div>' +
                    '</div>' +
                    '<div class="stat-card">' +
                        '<div class="stat-value">' + stats.currentStreak + '</div>' +
                        '<div class="stat-label">Current Streak</div>' +
                    '</div>' +
                    '<div class="stat-card">' +
                        '<div class="stat-value">' + stats.averageAccuracy + '%</div>' +
                        '<div class="stat-label">Avg Accuracy</div>' +
                    '</div>';
                
                this.userStatsDisplay.style.display = 'grid';
            }

            async showStats() {
                try {
                    const response = await fetch('/api/user/stats?' + new URLSearchParams({ userId: this.userId }));
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            this.displayFullStats(result.data);
                            this.statsModal.style.display = 'block';
                        }
                    }
                } catch (error) {
                    console.error('Failed to load full stats:', error);
                }
            }

            displayFullStats(stats) {
                let recentRoastsHtml = '';
                if (stats.recentRoasts && stats.recentRoasts.length > 0) {
                    recentRoastsHtml = '<h3>Recent Roasts:</h3>';
                    stats.recentRoasts.forEach(roast => {
                        recentRoastsHtml += '<div style="background: rgba(255,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">';
                        recentRoastsHtml += '<strong>' + roast.song + '</strong><br>';
                        recentRoastsHtml += roast.roast + '<br>';
                        recentRoastsHtml += '<small>Accuracy: ' + Math.round(roast.accuracy * 100) + '% | ' + new Date(roast.timestamp).toLocaleString() + '</small>';
                        recentRoastsHtml += '</div>';
                    });
                }

                document.getElementById('statsContent').innerHTML = 
                    '<div class="user-stats">' +
                        '<div class="stat-card"><div class="stat-value">' + stats.totalAttempts + '</div><div class="stat-label">Total Attempts</div></div>' +
                        '<div class="stat-card"><div class="stat-value">' + stats.currentStreak + '</div><div class="stat-label">Current Streak</div></div>' +
                        '<div class="stat-card"><div class="stat-value">' + stats.averageAccuracy + '%</div><div class="stat-label">Avg Accuracy</div></div>' +
                        '<div class="stat-card"><div class="stat-value">' + stats.roastIntensity + '</div><div class="stat-label">Intensity</div></div>' +
                    '</div>' +
                    '<p><strong>Favorite Victim:</strong> ' + stats.favoriteVictimSong + '</p>' +
                    '<p><strong>Member Since:</strong> ' + stats.memberSince + '</p>' +
                    recentRoastsHtml;
            }

            hideStats() {
                this.statsModal.style.display = 'none';
            }

            showStatus(message, type) {
                this.status.textContent = message;
                this.status.className = 'status ' + type;
                this.status.style.display = 'block';
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new KaraokeRoastMachine();
        });
    </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    console.log('Request:', request.method, url.pathname);
    
    if (request.method === 'OPTIONS') {
      return ResponseBuilder.cors();
    }
    
    // Serve main HTML page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return ResponseBuilder.html(HTML_CONTENT);
    }
    
    // User state management endpoints
    if (url.pathname === '/api/user/init' && request.method === 'POST') {
      return handleUserInit(request, env);
    }
    
    if (url.pathname === '/api/user/stats' && request.method === 'GET') {
      return handleUserStats(request, env);
    }
    
    if (url.pathname === '/api/user/intensity' && request.method === 'POST') {
      return handleUpdateIntensity(request, env);
    }
    
    // Main audio processing endpoint
    if (url.pathname === '/api/process-audio' && request.method === 'POST') {
      return handleAudioProcessing(request, env);
    }
    
    // Health check
    if (url.pathname === '/api/health') {
      return ResponseBuilder.success({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          ai: !!env.AI,
          userState: !!env.USER_STATE,
          workflow: !!env.AUDIO_WORKFLOW
        }
      });
    }
    
    return new Response('Not found', { 
      status: 404, 
      headers: AudioProcessor.getCorsHeaders() 
    });
  }
};

async function handleUserInit(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { userId: string };
    const { userId } = body;
    
    const userStateId = env.USER_STATE.idFromName(userId);
    const userState = env.USER_STATE.get(userStateId);
    
    // Use RPC method
    const result = await userState.initializeUser(userId);
    return ResponseBuilder.success(result);
    
  } catch (error) {
    console.error('User init error:', error);
    return ResponseBuilder.error('Failed to initialize user');
  }
}

async function handleUserStats(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return ResponseBuilder.error('User ID required');
    }
    
    const userStateId = env.USER_STATE.idFromName(userId);
    const userState = env.USER_STATE.get(userStateId);
    
    // Use RPC method
    const stats = await userState.getStats();
    return ResponseBuilder.success(stats);
    
  } catch (error) {
    console.error('Stats error:', error);
    return ResponseBuilder.error('Failed to get user stats');
  }
}

async function handleUpdateIntensity(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { userId: string; intensity: string };
    const { userId, intensity } = body;
    
    const userStateId = env.USER_STATE.idFromName(userId);
    const userState = env.USER_STATE.get(userStateId);
    
    // Use RPC method
    const result = await userState.updateIntensity(intensity);
    return ResponseBuilder.success(result);
    
  } catch (error) {
    console.error('Intensity update error:', error);
    return ResponseBuilder.error('Failed to update intensity');
  }
}

async function handleAudioProcessing(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId = formData.get('userId') as string;
    const intensity = formData.get('intensity') as string || 'medium';
    
    if (!audioFile || !userId) {
      return ResponseBuilder.error('Audio file and user ID required');
    }
    
    // Validate audio file
    const validation = AudioProcessor.validateAudioFile(audioFile);
    if (!validation.valid) {
      return ResponseBuilder.error(validation.error!);
    }
    
    // Convert audio to array format
    const audioArray = await AudioProcessor.fileToArray(audioFile);
    const sessionId = AudioProcessor.generateSessionId();
    
    console.log('Starting workflow for user:', userId, 'Audio size:', audioArray.length);
    
    // Create workflow instance
    const workflowInstance = await env.AUDIO_WORKFLOW.create({
      params: {
        audioData: audioArray,
        userId,
        intensity,
        sessionId
      }
    });
    
    console.log('Workflow created with ID:', workflowInstance.id);
    
    // Wait for workflow to complete by polling status
    let status = await workflowInstance.status();
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait
    
    while ((status.status === 'running' || status.status === 'queued') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      status = await workflowInstance.status();
      attempts++;
      console.log('Workflow status:', status.status, 'attempt:', attempts);
    }
    if (status) {
        console.log(status.status)
    }
    
    if (status.status === 'complete') {
      const result = status.output;
      console.log('Workflow completed successfully');
      const processingTime = Date.now() - startTime;
      return ResponseBuilder.success(result, processingTime);
    } else {
      console.error('Workflow failed or timed out:', status);
      throw new Error('Workflow failed or timed out: ' + status.status);
    }
    
  } catch (error) {
    console.error('Audio processing error:', error);
    return ResponseBuilder.error('Processing failed: ' + (error as any)?.message || String(error), 500);
  }
}