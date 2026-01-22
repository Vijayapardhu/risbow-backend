import { Controller, Post, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BowService } from './bow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BowMessageDto, BowActionExecuteDto } from './dto/bow.dto';

@ApiTags('Bow')
@Controller('bow')
export class BowController {
    private readonly logger = new Logger(BowController.name);

    constructor(private readonly bowService: BowService) { }

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
}
