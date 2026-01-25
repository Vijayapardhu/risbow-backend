import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FraudRiskScore {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: {
    velocity: number;
    amount: number;
    frequency: number;
    deviceRisk: number;
    locationRisk: number;
    timePatternRisk: number;
    historyRisk: number;
  };
  reasons: string[];
  recommendations: string[];
}

export interface FraudDetectionConfig {
  velocityThreshold: number; // transactions per hour
  amountThreshold: number; // amount in rupees
  frequencyThreshold: number; // transactions per day
  suspiciousPatterns: string[];
  riskWeights: {
    velocity: number;
    amount: number;
    frequency: number;
    device: number;
    location: number;
    timePattern: number;
    history: number;
  };
}

@Injectable()
export class BowFraudDetectionService {
  private readonly logger = new Logger(BowFraudDetectionService.name);
  private config: FraudDetectionConfig = {
    velocityThreshold: 5, // 5 transactions per hour
    amountThreshold: 10000, // ₹10,000
    frequencyThreshold: 20, // 20 transactions per day
    suspiciousPatterns: [
      'multiple_same_device_different_locations',
      'rapid_small_amounts',
      'unusual_timing_patterns',
      'new_account_large_orders',
      'suspicious_email_domains'
    ],
    riskWeights: {
      velocity: 0.25,
      amount: 0.20,
      frequency: 0.15,
      device: 0.15,
      location: 0.10,
      timePattern: 0.10,
      history: 0.05
    }
  };

  constructor(private prisma: PrismaService) {
    this.initializeFraudDetection();
  }

  private async initializeFraudDetection() {
    try {
      this.logger.log('Initializing Fraud Detection System');
      
      // Load existing fraud patterns
      await this.loadFraudPatterns();
      
      // Set up real-time monitoring
      this.startRealTimeMonitoring();
      
      this.logger.log('Fraud Detection System initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize fraud detection: ${error.message}`);
    }
  }

  /**
   * Analyze transaction for fraud risk
   */
  async analyzeTransaction(
    userId: string,
    transactionData: {
      amount: number;
      device?: string;
      location?: string;
      ipAddress?: string;
      timestamp: Date;
      paymentMethod?: string;
      email?: string;
      shippingAddress?: any;
    }
  ): Promise<FraudRiskScore> {
    try {
      this.logger.log(`Analyzing transaction for user ${userId}: ₹${transactionData.amount}`);

      const factors = {
        velocity: await this.analyzeVelocity(userId, transactionData.timestamp),
        amount: await this.analyzeAmount(userId, transactionData.amount),
        frequency: await this.analyzeFrequency(userId, transactionData.timestamp),
        deviceRisk: await this.analyzeDeviceRisk(userId, transactionData.device),
        locationRisk: await this.analyzeLocationRisk(userId, transactionData.location, transactionData.ipAddress),
        timePatternRisk: await this.analyzeTimePattern(userId, transactionData.timestamp),
        historyRisk: await this.analyzeUserHistory(userId)
      };

      // Calculate weighted score
      let totalScore = 0;
      totalScore += factors.velocity * this.config.riskWeights.velocity;
      totalScore += factors.amount * this.config.riskWeights.amount;
      totalScore += factors.frequency * this.config.riskWeights.frequency;
      totalScore += factors.deviceRisk * this.config.riskWeights.device;
      totalScore += factors.locationRisk * this.config.riskWeights.location;
      totalScore += factors.timePatternRisk * this.config.riskWeights.timePattern;
      totalScore += factors.historyRisk * this.config.riskWeights.history;

      // Normalize to 0-100 scale
      const normalizedScore = Math.min(100, Math.max(0, totalScore * 10));

      const { level, reasons, recommendations } = this.determineRiskLevel(
        normalizedScore,
        factors,
        transactionData
      );

      const riskScore: FraudRiskScore = {
        score: normalizedScore,
        level,
        factors,
        reasons,
        recommendations
      };

      // Log the analysis
      await this.logFraudAnalysis(userId, transactionData, riskScore);

      return riskScore;

    } catch (error) {
      this.logger.error(`Fraud analysis error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze transaction velocity (transactions per time period)
   */
  private async analyzeVelocity(userId: string, timestamp: Date): Promise<number> {
    const oneHourAgo = new Date(timestamp.getTime() - 60 * 60 * 1000);
    
    const recentTransactions = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
        status: { not: 'CANCELLED' }
      },
      select: { createdAt: true }
    });

    const transactionCount = recentTransactions.length;
    
    if (transactionCount > this.config.velocityThreshold) {
      return Math.min(1, transactionCount / this.config.velocityThreshold);
    }

    return Math.min(0.5, transactionCount / (this.config.velocityThreshold * 2));
  }

  /**
   * Analyze transaction amount for suspicious patterns
   */
  private async analyzeAmount(userId: string, amount: number): Promise<number> {
    // Get user's average transaction amount
    const userOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' }
      },
      select: { totalAmount: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (userOrders.length === 0) {
      // New user - check if amount is unusually high
      return amount > this.config.amountThreshold ? 0.8 : 0.2;
    }

    const averageAmount = userOrders.reduce((sum, order) => sum + order.totalAmount, 0) / userOrders.length;
    
    // Check if current amount is significantly higher than average
    const ratio = amount / averageAmount;
    
    if (ratio > 3) {
      return 0.9; // Very suspicious
    } else if (ratio > 2) {
      return 0.6; // Suspicious
    } else if (ratio > 1.5) {
      return 0.3; // Moderate concern
    }

    return 0.1; // Normal
  }

  /**
   * Analyze transaction frequency
   */
  private async analyzeFrequency(userId: string, timestamp: Date): Promise<number> {
    const oneDayAgo = new Date(timestamp.getTime() - 24 * 60 * 60 * 1000);
    
    const dayTransactions = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: oneDayAgo },
        status: { not: 'CANCELLED' }
      },
      select: { createdAt: true }
    });

    const transactionCount = dayTransactions.length;
    
    if (transactionCount > this.config.frequencyThreshold) {
      return Math.min(1, transactionCount / this.config.frequencyThreshold);
    }

    return Math.min(0.5, transactionCount / (this.config.frequencyThreshold * 2));
  }

  /**
   * Analyze device risk
   */
  private async analyzeDeviceRisk(userId: string, device?: string): Promise<number> {
    if (!device) return 0.1;

    // NOTE: Order does not currently store device fingerprints in this schema.
    // Degrade gracefully: treat provided device as low-to-medium risk signal.
    return 0.2;
  }

  /**
   * Analyze location and IP address risk
   */
  private async analyzeLocationRisk(
    userId: string,
    location?: string,
    ipAddress?: string
  ): Promise<number> {
    if (!location && !ipAddress) return 0.1;

    // - Suspicious IP ranges (basic check)
    if (ipAddress) {
      const suspiciousRanges = [
        '10.0.0.', // Private networks
        '192.168.',
        '172.16.',
        '127.0.0.', // Localhost
      ];

      for (const range of suspiciousRanges) {
        if (ipAddress.startsWith(range)) {
          return 0.5;
        }
      }
    }

    return 0.1;
  }

  /**
   * Analyze time patterns for suspicious activity
   */
  private async analyzeTimePattern(userId: string, timestamp: Date): Promise<number> {
    const hour = timestamp.getHours();
    
    // Get user's typical order times
    const userOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' }
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const hours = userOrders.map(order => new Date(order.createdAt).getHours());
    const hourCounts = new Map<number, number>();
    
    hours.forEach(h => {
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    });

    // Get most common hours
    const commonHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => h);

    // Risk factors:
    // - Ordering at unusual hours (2-5 AM)
    if (hour >= 2 && hour <= 5 && !commonHours.includes(hour)) {
      return 0.6;
    }

    // - Very late night orders (11 PM - 4 AM)
    if (hour >= 23 || hour <= 4 && !commonHours.includes(hour)) {
      return 0.4;
    }

    return 0.1;
  }

  /**
   * Analyze user's historical behavior
   */
  private async analyzeUserHistory(userId: string): Promise<number> {
    // Get user account age
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, email: true }
    });

    if (!user) return 0.5;

    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);

    // Risk factors:
    // - Very new account (< 7 days)
    if (accountAgeDays < 7) {
      return 0.7;
    }

    // - Missing email (best-effort risk signal)
    if (!user.email) return 0.4;

    // - Suspicious email domain
    if (user.email) {
      const domain = user.email.split('@')[1]?.toLowerCase();
      const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
      
      if (suspiciousDomains.includes(domain)) {
        return 0.6;
      }
    }

    // - Account age < 30 days
    if (accountAgeDays < 30) {
      return 0.3;
    }

    return 0.1;
  }

  /**
   * Determine risk level and generate recommendations
   */
  private determineRiskLevel(
    score: number,
    factors: any,
    transactionData: any
  ): { level: FraudRiskScore['level']; reasons: string[]; recommendations: string[] } {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    let level: FraudRiskScore['level'] = 'LOW';

    if (score >= 80) {
      level = 'CRITICAL';
      reasons.push('Extremely high fraud risk detected');
      recommendations.push('Block transaction immediately');
      recommendations.push('Require manual verification');
      recommendations.push('Consider account suspension');
    } else if (score >= 60) {
      level = 'HIGH';
      reasons.push('High fraud risk detected');
      recommendations.push('Additional verification required');
      recommendations.push('Limit account functionality');
    } else if (score >= 40) {
      level = 'MEDIUM';
      reasons.push('Moderate fraud risk detected');
      recommendations.push('Enhanced monitoring required');
      recommendations.push('Consider 2FA for high-value transactions');
    }

    // Add specific reasons based on factors
    if (factors.velocity > 0.7) {
      reasons.push('Unusual transaction velocity');
    }
    if (factors.amount > 0.7) {
      reasons.push('Unusual transaction amount');
    }
    if (factors.frequency > 0.7) {
      reasons.push('High transaction frequency');
    }
    if (factors.deviceRisk > 0.5) {
      reasons.push('Suspicious device usage');
    }
    if (factors.locationRisk > 0.5) {
      reasons.push('Multiple locations/IP addresses');
    }

    return { level, reasons, recommendations };
  }

  /**
   * Log fraud analysis results
   */
  private async logFraudAnalysis(
    userId: string,
    transactionData: any,
    riskScore: FraudRiskScore
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: userId,
          entity: 'FRAUD',
          entityId: String(transactionData?.referenceId || userId),
          action: 'FRAUD_ANALYSIS',
          details: {
            userId,
            amount: transactionData?.amount,
            score: riskScore.score,
            level: riskScore.level,
            factors: riskScore.factors,
            reasons: riskScore.reasons,
            recommendations: riskScore.recommendations,
            transactionData,
          },
        } as any,
      });

      this.logger.log(`Fraud analysis logged: Level ${riskScore.level}, Score ${riskScore.score}`);

    } catch (error) {
      this.logger.error(`Failed to log fraud analysis: ${error.message}`);
    }
  }

  /**
   * Get fraud detection statistics
   */
  async getFraudStats(): Promise<any> {
    try {
      const [totalLogs, recentLogs] = await Promise.all([
        this.prisma.auditLog.count({ where: { entity: 'FRAUD', action: 'FRAUD_ANALYSIS' } }),
        this.prisma.auditLog.findMany({
          where: {
            entity: 'FRAUD',
            action: 'FRAUD_ANALYSIS',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      ]);

      const extractLevel = (d: any) => String(d?.details?.level || 'LOW').toUpperCase();
      const criticalCount = recentLogs.filter((l: any) => extractLevel(l) === 'CRITICAL').length;
      const highCount = recentLogs.filter((l: any) => extractLevel(l) === 'HIGH').length;
      const mediumCount = recentLogs.filter((l: any) => extractLevel(l) === 'MEDIUM').length;

      return {
        totalAnalyses: totalLogs,
        riskLevelDistribution: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: totalLogs - criticalCount - highCount - mediumCount
        },
        recentActivity: recentLogs.length,
        averageRiskScore: recentLogs.length > 0 
          ? recentLogs.reduce((sum: number, log: any) => sum + Number(log?.details?.score || 0), 0) / recentLogs.length 
          : 0,
        topReasons: this.getTopFraudReasons(recentLogs)
      };

    } catch (error) {
      this.logger.error(`Error getting fraud stats: ${error.message}`);
      return {
        totalAnalyses: 0,
        riskLevelDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
        recentActivity: 0,
        averageRiskScore: 0,
        topReasons: []
      };
    }
  }

  /**
   * Get top fraud reasons
   */
  private getTopFraudReasons(logs: any[]): string[] {
    const reasonCounts = new Map<string, number>();
    
    logs.forEach(log => {
      const reasons = log?.details?.reasons;
      if (Array.isArray(reasons)) {
        reasons.forEach((reason: string) => {
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });
      }
    });

    return Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason]) => reason);
  }

  /**
   * Load existing fraud patterns
   */
  private async loadFraudPatterns(): Promise<void> {
    // TODO: Load historical fraud patterns from database
    this.logger.log('Loading fraud patterns');
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    // TODO: Set up real-time monitoring of transactions
    this.logger.log('Starting real-time fraud monitoring');
  }

  /**
   * Check if fraud detection is properly configured
   */
  async isFraudDetectionReady(): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (!this.prisma) {
      issues.push('Prisma service not available');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }
}