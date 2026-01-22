import { Injectable, Logger } from '@nestjs/common';

export interface SessionContext {
    sessionId: string;
    userId: string;
    conversationHistory: ConversationMessage[];
    userPreferences: {
        priceRange?: { min: number; max: number };
        preferredCategories?: string[];
        lastSearchQuery?: string;
        viewedProducts?: string[];
    };
    sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    pendingAction?: {
        type: string;
        payload: any;
        timestamp: Date;
    };
    startedAt: Date;
    lastActiveAt: Date;
}

export interface ConversationMessage {
    role: 'user' | 'bow';
    message: string;
    intent?: string;
    timestamp: Date;
}

@Injectable()
export class BowSessionService {
    private readonly logger = new Logger(BowSessionService.name);
    private sessions = new Map<string, SessionContext>();
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    getOrCreateSession(userId: string, sessionId?: string): SessionContext {
        const sid = sessionId || `session-${userId}-${Date.now()}`;
        
        let session = this.sessions.get(sid);
        
        if (!session || this.isSessionExpired(session)) {
            session = {
                sessionId: sid,
                userId,
                conversationHistory: [],
                userPreferences: {},
                sentiment: 'neutral',
                startedAt: new Date(),
                lastActiveAt: new Date()
            };
            this.sessions.set(sid, session);
            this.logger.log(`Created new session ${sid} for user ${userId}`);
        } else {
            session.lastActiveAt = new Date();
        }
        
        return session;
    }

    addMessage(sessionId: string, role: 'user' | 'bow', message: string, intent?: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.conversationHistory.push({
                role,
                message,
                intent,
                timestamp: new Date()
            });
            
            // Keep only last 20 messages for memory management
            if (session.conversationHistory.length > 20) {
                session.conversationHistory = session.conversationHistory.slice(-20);
            }
            
            session.lastActiveAt = new Date();
        }
    }

    updateSentiment(sessionId: string, sentiment: SessionContext['sentiment']) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.sentiment = sentiment;
            this.logger.log(`Updated sentiment for ${sessionId}: ${sentiment}`);
        }
    }

    setPendingAction(sessionId: string, actionType: string, payload: any) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.pendingAction = {
                type: actionType,
                payload,
                timestamp: new Date()
            };
            this.logger.log(`Set pending action ${actionType} for session ${sessionId}`);
        }
    }

    getPendingAction(sessionId: string) {
        const session = this.sessions.get(sessionId);
        return session?.pendingAction;
    }

    clearPendingAction(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.pendingAction = undefined;
            this.logger.log(`Cleared pending action for session ${sessionId}`);
        }
    }

    updatePreferences(sessionId: string, preferences: Partial<SessionContext['userPreferences']>) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.userPreferences = { ...session.userPreferences, ...preferences };
        }
    }

    getRecentContext(sessionId: string, messageCount: number = 3): ConversationMessage[] {
        const session = this.sessions.get(sessionId);
        return session?.conversationHistory.slice(-messageCount) || [];
    }

    hasRecentlyDiscussed(sessionId: string, topic: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        
        const recentMessages = session.conversationHistory.slice(-5);
        return recentMessages.some(msg => 
            msg.message.toLowerCase().includes(topic.toLowerCase())
        );
    }

    private isSessionExpired(session: SessionContext): boolean {
        const now = Date.now();
        const lastActive = session.lastActiveAt.getTime();
        return (now - lastActive) > this.SESSION_TIMEOUT;
    }

    // Cleanup expired sessions periodically
    cleanupExpiredSessions() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (this.isSessionExpired(session)) {
                this.sessions.delete(sessionId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.logger.log(`Cleaned up ${cleaned} expired sessions`);
        }
    }
}
