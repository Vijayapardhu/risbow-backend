import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
    constructor(private readonly returnsService: ReturnsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create a new return request for a customer' })
    create(@Request() req: any, @Body() createReturnDto: CreateReturnDto) {
        return this.returnsService.create(req.user.id, createReturnDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get my returns (Customer) or All Returns (Admin)' })
    findAll(@Request() req: any, @Query() query: any) {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            query.userId = req.user.id;
        }
        return this.returnsService.findAll(query);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get detailed return info' })
    findOne(@Param('id') id: string) {
        return this.returnsService.findOne(id);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Admin: Update return status' })
    updateStatus(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateReturnStatusDto: UpdateReturnStatusDto,
    ) {
        return this.returnsService.updateStatus(id, updateReturnStatusDto, req.user.id);
    }

    @Patch(':id/ship-replacement')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Admin: Mark replacement as shipped with tracking' })
    shipReplacement(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { trackingId: string },
    ) {
        return this.returnsService.shipReplacement(id, body.trackingId, req.user.id);
    }

    @Post(':id/submit-qc')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Admin/Agent: Submit QC checklist for a return order' })
    submitQC(
        @Request() req: any,
        @Param('id') id: string, // orderId context
        @Body() checklist: any,
    ) {
        return this.returnsService.submitQCChecklist(id, req.user.id, checklist);
    }
}
