import { Injectable, Logger } from '@nestjs/common';
import { GoogleVoice } from '@mastra/voice-google';
import { OpenAIVoice } from '@mastra/voice-openai';
import { BowService } from './bow.service';
import { BowMessageDto, BowResponse } from './dto/bow.dto';

export interface VoiceAssistantConfig {
  provider: 'google' | 'openai' | 'deepgram';
  language: string;
  voiceId?: string;
}

export interface VoiceProcessOptions {
  userId: string;
  audioBuffer: Buffer;
  config?: VoiceAssistantConfig;
  context?: any;
}

export interface VoiceResponse {
  text: string;
  audioBuffer?: Buffer;
  confidence: number;
  processingTime: number;
}

@Injectable()
export class BowVoiceAssistantService {
  private readonly logger = new Logger(BowVoiceAssistantService.name);
  private googleVoice: GoogleVoice;
  private openaiVoice: OpenAIVoice;

  constructor(private bowService: BowService) {
    // Initialize voice providers
    this.initializeVoiceProviders();
  }

  private initializeVoiceProviders() {
    try {
      // Initialize Google Voice (uses GOOGLE_API_KEY env var)
      this.googleVoice = new GoogleVoice({
        speechModel: {
          apiKey: process.env.GOOGLE_API_KEY,
        },
        listeningModel: {
          apiKey: process.env.GOOGLE_API_KEY,
        },
        speaker: 'en-US-Standard-F',
      });

      // Initialize OpenAI Voice (uses OPENAI_API_KEY env var)
      this.openaiVoice = new OpenAIVoice({
        speechModel: {
          name: 'tts-1-hd',
          apiKey: process.env.OPENAI_API_KEY,
        },
        listeningModel: {
          name: 'whisper-1',
          apiKey: process.env.OPENAI_API_KEY,
        },
        speaker: 'alloy',
      });

      this.logger.log('Voice providers initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize voice providers: ${error.message}`);
    }
  }

  /**
   * Process voice input and return Bow AI response
   */
  async processVoiceInput(options: VoiceProcessOptions): Promise<VoiceResponse> {
    const startTime = Date.now();
    const { userId, audioBuffer, config = { provider: 'openai', language: 'en-US' }, context } = options;

    try {
      this.logger.log(`Processing voice input for user ${userId} with provider ${config.provider}`);

      // Step 1: Convert speech to text
      const transcribedText = await this.speechToText(audioBuffer, config);
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('Could not transcribe audio input');
      }

      this.logger.log(`Transcribed text: "${transcribedText}"`);

      // Step 2: Process text through Bow AI
      const bowResponse = await this.bowService.processMessage(userId, {
        message: transcribedText,
        context: context || {}
      });

      // Step 3: Convert response back to speech (optional)
      const responseAudio = await this.textToSpeech(bowResponse.message || '', config);

      const processingTime = Date.now() - startTime;

      return {
        text: bowResponse.message || '',
        audioBuffer: responseAudio,
        confidence: 0.95, // TODO: Calculate actual confidence from STT
        processingTime
      };

    } catch (error) {
      this.logger.error(`Error processing voice input: ${error.message}`, error.stack);
      
      // Fallback response
      const fallbackMessage = 'I apologize, but I could not process your voice request. Please try again or type your message.';
      const fallbackAudio = await this.textToSpeech(fallbackMessage, config);

      return {
        text: fallbackMessage,
        audioBuffer: fallbackAudio,
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Convert speech to text using configured provider
   */
  private async speechToText(audioBuffer: Buffer, config: VoiceAssistantConfig): Promise<string> {
    try {
      let voiceProvider;
      
      switch (config.provider) {
        case 'google':
          voiceProvider = this.googleVoice;
          break;
        case 'openai':
        default:
          voiceProvider = this.openaiVoice;
          break;
      }

      // Convert buffer to stream for the voice provider
      const audioStream = this.bufferToStream(audioBuffer);
      
      // Transcribe speech
      const transcription = await voiceProvider.listen(audioStream, {
        language: config.language,
        filetype: 'wav'
      });

      return transcription || '';

    } catch (error) {
      this.logger.error(`Speech-to-text error with ${config.provider}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert text to speech using configured provider
   */
  private async textToSpeech(text: string, config: VoiceAssistantConfig): Promise<Buffer> {
    try {
      let voiceProvider;
      
      switch (config.provider) {
        case 'google':
          voiceProvider = this.googleVoice;
          break;
        case 'openai':
        default:
          voiceProvider = this.openaiVoice;
          break;
      }

      // Generate speech
      const audioStream = await voiceProvider.speak(text, {
        speaker: config.voiceId,
        languageCode: config.language,
        speed: 1.0
      });

      // Convert stream to buffer
      return await this.streamToBuffer(audioStream);

    } catch (error) {
      this.logger.error(`Text-to-speech error with ${config.provider}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available voices for a provider
   */
  async getAvailableVoices(provider: 'google' | 'openai' = 'openai'): Promise<any[]> {
    try {
      let voiceProvider;
      
      switch (provider) {
        case 'google':
          voiceProvider = this.googleVoice;
          break;
        case 'openai':
        default:
          voiceProvider = this.openaiVoice;
          break;
      }

      const voices = await voiceProvider.getSpeakers();
      return voices || [];

    } catch (error) {
      this.logger.error(`Error getting voices for ${provider}: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if voice assistant is properly configured
   */
  async isVoiceAssistantReady(): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for required API keys
    if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
      issues.push('No voice provider API keys configured (OPENAI_API_KEY or GOOGLE_API_KEY)');
    }

    // Check if voice providers are initialized
    if (!this.openaiVoice && !this.googleVoice) {
      issues.push('Voice providers not initialized');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * Convert Buffer to ReadableStream
   */
  private bufferToStream(buffer: Buffer): ReadableStream {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(buffer);
        controller.close();
      }
    });
  }

  /**
   * Convert ReadableStream to Buffer
   */
  private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(result);
  }

  /**
   * Get voice assistant usage statistics
   */
  async getVoiceStats(userId?: string) {
    // TODO: Implement voice usage tracking
    return {
      totalVoiceSessions: 0,
      averageProcessingTime: 0,
      preferredProvider: 'openai',
      supportedLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN', 'te-IN']
    };
  }
}