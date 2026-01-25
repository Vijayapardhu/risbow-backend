import { Controller, Post, Body, UseGuards, Request, Logger, Get, Query, UseInterceptors, UploadedFile, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { BowService } from './bow.service';
import { BowVoiceAssistantService } from './bow-voice-assistant.service';
import { BowVisualSearchService } from './bow-visual-search.service';
import { BowMLPersonalizationEngine } from './bow-ml-personalization.service';
import { BowFraudDetectionService } from './bow-fraud-detection.service';
import { BowDemandForecastingService } from './bow-demand-forecasting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BowMessageDto, BowActionExecuteDto } from './dto/bow.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Bow')
@Controller('bow')
export class BowController {
    private readonly logger = new Logger(BowController.name);

    constructor(
        private readonly bowService: BowService,
        private readonly voiceAssistantService: BowVoiceAssistantService,
        private readonly visualSearchService: BowVisualSearchService,
        private readonly mlPersonalizationEngine: BowMLPersonalizationEngine,
        private readonly fraudDetectionService: BowFraudDetectionService,
        private readonly demandForecastingService: BowDemandForecastingService
    ) { }

    @Post('chat')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Send a message to Bow AI' })
    async chat(@Request() req, @Body() dto: BowMessageDto) {
        try {
            const userId = req.user?.id;
            this.logger.log(`Chat request from user ${userId}: ${dto.message}`);
            const response = await this.bowService.processMessage(userId, dto);
            this.logger.log(`Chat response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            this.logger.error(`Chat error: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Post('actions/execute')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Execute an action proposed by Bow' })
    async executeAction(@Request() req, @Body() dto: BowActionExecuteDto) {
        const userId = req.user?.id;
        return this.bowService.executeAction(userId, dto);
    }

    @Post('voice/process')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('audio'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Process voice input and return audio response' })
    async processVoice(
        @Request() req,
        @UploadedFile() audio: Express.Multer.File,
        @Body('config') configJson?: string
    ) {
        try {
            const userId = req.user?.id;
            const config = configJson ? JSON.parse(configJson) : { provider: 'openai', language: 'en-US' };
            
            this.logger.log(`Voice request from user ${userId} with provider ${config.provider}`);

            if (!audio) {
                throw new Error('Audio file is required');
            }

            const response = await this.voiceAssistantService.processVoiceInput({
                userId,
                audioBuffer: audio.buffer,
                config,
                context: {}
            });

            // Return response with base64 encoded audio
            return {
                text: response.text,
                audio: response.audioBuffer ? response.audioBuffer.toString('base64') : null,
                confidence: response.confidence,
                processingTime: response.processingTime
            };
        } catch (error) {
            this.logger.error(`Voice processing error: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get('voice/voices')
    @ApiOperation({ summary: 'Get available voices for text-to-speech' })
    async getAvailableVoices(@Query('provider') provider: 'google' | 'openai' = 'openai') {
        return await this.voiceAssistantService.getAvailableVoices(provider);
    }

    @Get('voice/status')
    @ApiOperation({ summary: 'Check if voice assistant is ready' })
    async getVoiceStatus() {
        return await this.voiceAssistantService.isVoiceAssistantReady();
    }

    @Get('voice/stats')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get voice assistant usage statistics' })
    async getVoiceStats(@Request() req) {
        const userId = req.user?.id;
        return await this.voiceAssistantService.getVoiceStats(userId);
    }

    @Post('visual-search')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Search products by image using AI' })
    async searchByImage(
        @Request() req,
        @UploadedFile() image: Express.Multer.File,
        @Body('options') optionsJson?: string
    ) {
        try {
            const userId = req.user?.id;
            const options = optionsJson ? JSON.parse(optionsJson) : { maxResults: 10 };
            
            this.logger.log(`Visual search request from user ${userId}`);

            if (!image) {
                throw new Error('Image file is required');
            }

            const results = await this.visualSearchService.searchByImage(image.buffer, options);

            return {
                success: true,
                results: results,
                count: results.length,
                processingTime: Date.now()
            };
        } catch (error) {
            this.logger.error(`Visual search error: ${error.message}`, error.stack);
            return {
                success: false,
                error: error.message,
                results: [],
                count: 0
            };
        }
    }

    @Get('visual-search/similar/:productId')
    @ApiOperation({ summary: 'Find visually similar products' })
    async findSimilarProducts(
        @Param('productId') productId: string,
        @Query() options: any
    ) {
        try {
            const results = await this.visualSearchService.findSimilarProducts(productId, options);
            return {
                success: true,
                results,
                count: results.length
            };
        } catch (error) {
            this.logger.error(`Similar products error: ${error.message}`, error.stack);
            return {
                success: false,
                error: error.message,
                results: [],
                count: 0
            };
        }
    }

    @Get('visual-search/status')
    @ApiOperation({ summary: 'Check if visual search is ready' })
    async getVisualSearchStatus() {
        return await this.visualSearchService.isVisualSearchReady();
    }

    @Get('visual-search/stats')
    @ApiOperation({ summary: 'Get visual search statistics' })
    async getVisualSearchStats() {
        return await this.visualSearchService.getVisualSearchStats();
    }

    @Get('personalization/recommendations')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get personalized recommendations' })
    async getPersonalizedRecommendations(
        @Request() req,
        @Query('strategy') strategy?: 'collaborative' | 'content' | 'hybrid' | 'behavioral',
        @Query('count') count?: number
    ) {
        const userId = req.user?.id;
        const options = {
            count: count || 10,
            strategy: strategy || 'hybrid'
        };

        const recommendations = await this.mlPersonalizationEngine.getPersonalizedRecommendations(userId, options);

        return {
            success: true,
            recommendations,
            strategy: options.strategy,
            count: recommendations.length
        };
    }

    @Post('personalization/retrain')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Retrain ML models' })
    async retrainModels(@Request() req) {
        const userId = req.user?.id;
        
        // Only allow admin users to retrain models
        if (req.user?.role !== 'SUPER_ADMIN') {
            return {
                success: false,
                error: 'Unauthorized to retrain models'
            };
        }

        await this.mlPersonalizationEngine.retrainModels();

        return {
            success: true,
            message: 'ML models retraining initiated'
        };
    }

    @Get('personalization/stats')
    @ApiOperation({ summary: 'Get personalization engine statistics' })
    async getPersonalizationStats() {
        return await this.mlPersonalizationEngine.getPersonalizationStats();
    }

    @Post('demand-forecast/generate')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Generate demand forecast' })
    async generateDemandForecast(
        @Request() req,
        @Body('productId') productId: string,
        @Body('options') options?: any
    ) {
        const userId = req.user?.id;
        
        const forecast = await this.demandForecastingService.generateDemandForecast(productId, options);

        return {
            success: true,
            forecast,
            message: 'Demand forecast generated successfully'
        };
    }

    @Get('demand-forecast/alerts')
    @ApiOperation({ summary: 'Get inventory alerts based on forecasts' })
    async getInventoryAlerts(
        @Query('productId') productId?: string
    ) {
        const alerts = await this.demandForecastingService.getInventoryAlerts(productId);

        return {
            success: true,
            alerts,
            count: alerts.length
        };
    }

    @Get('demand-forecast/stats')
    @ApiOperation({ summary: 'Get demand forecasting statistics' })
    async getDemandForecastingStats() {
        return await this.demandForecastingService.getForecastingStats();
    }
}
