import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ReturnsQCService } from './returns-qc.service';

@ApiTags('Returns QC')
@ApiBearerAuth()
@Controller('returns/qc')
export class ReturnsQCController {
    constructor(private readonly qcService: ReturnsQCService) { }

    @Post('submit')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TELECALLER) // Agent role needed? Using TELECALLER/ADMIN for now
    @ApiOperation({ summary: 'Submit QC checklist for return pickup' })
    async submitChecklist(@Request() req: any, @Body() dto: {
        orderId: string;
        isBrandBoxIntact: boolean;
        isProductIntact: boolean;
        missingAccessories: string[];
        images: string[];
        videoPath?: string;
        notes?: string;
    }) {
        return this.qcService.submitChecklist({
            ...dto,
            agentId: req.user.id
        });
    }
}
