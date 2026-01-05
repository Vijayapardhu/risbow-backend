import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BowService } from './bow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bow')
export class BowController {
    constructor(private readonly bowService: BowService) { }

    @Post('chat')
    @UseGuards(JwtAuthGuard)
    async chat(@Body('message') message: string) {
        return this.bowService.chat(message);
    }

    @Post('tryon')
    @UseGuards(JwtAuthGuard)
    async tryOn(@Body('image') image: string) {
        return this.bowService.tryOn(image);
    }
}
