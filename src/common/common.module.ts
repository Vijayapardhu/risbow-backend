import { Module, Global } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { SettlementService } from './settlement.service';
import { PriceResolverService } from './price-resolver.service';
import { FinancialSnapshotGuardService } from './financial-snapshot-guard.service';
import { RedisLockService } from './redis-lock.service';
import { FraudService } from './fraud.service';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
    imports: [AuditModule],
    providers: [CommissionService, SettlementService, PriceResolverService, FinancialSnapshotGuardService, RedisLockService, FraudService],
    exports: [CommissionService, SettlementService, PriceResolverService, FinancialSnapshotGuardService, RedisLockService, FraudService],
})
export class CommonModule { }
