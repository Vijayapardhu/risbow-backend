import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsEnum,
    Min,
    IsDateString,
} from 'class-validator';
import { PayoutStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class RequestPayoutDto {
    @ApiProperty({ description: 'Amount to request for payout in paise', example: 10000 })
    @IsNotEmpty()
    @IsNumber()
    @Min(10000, { message: 'Minimum payout amount is ₹100 (10000 paise)' })
    amount: number;
}

export class UpdateBankDetailsDto {
    @ApiProperty({ description: 'Bank account number', example: '1234567890123456' })
    @IsNotEmpty()
    @IsString()
    accountNumber: string;

    @ApiProperty({ description: 'IFSC code', example: 'HDFC0001234' })
    @IsNotEmpty()
    @IsString()
    ifscCode: string;

    @ApiProperty({ description: 'Account holder name', example: 'John Doe' })
    @IsNotEmpty()
    @IsString()
    accountHolderName: string;

    @ApiProperty({ description: 'Bank name', example: 'HDFC Bank' })
    @IsNotEmpty()
    @IsString()
    bankName: string;
}

export class PayoutHistoryQueryDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Filter by payout status', enum: PayoutStatus })
    @IsOptional()
    @IsEnum(PayoutStatus)
    status?: PayoutStatus;

    @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class PayoutBalanceResponseDto {
    @ApiProperty({ description: 'Pending earnings in paise' })
    pendingEarnings: number;

    @ApiProperty({ description: 'Available balance after commission in paise' })
    availableBalance: number;

    @ApiProperty({ description: 'Total amount paid out in paise' })
    totalPaidOut: number;

    @ApiProperty({ description: 'Last payout date', nullable: true })
    lastPayoutDate: Date | null;

    @ApiProperty({ description: 'Commission rate as decimal' })
    commissionRate: number;
}

export class PayoutSummaryResponseDto {
    @ApiProperty({ description: 'Total earned all time in paise' })
    totalEarned: number;

    @ApiProperty({ description: 'Total paid out in paise' })
    totalPaidOut: number;

    @ApiProperty({ description: 'Number of pending payouts' })
    pendingPayoutsCount: number;

    @ApiProperty({ description: 'Total amount in pending payouts in paise' })
    pendingPayoutsAmount: number;

    @ApiProperty({ description: 'Last payout date', nullable: true })
    lastPayoutDate: Date | null;

    @ApiProperty({ description: 'Last payout amount in paise', nullable: true })
    lastPayoutAmount: number | null;
}
