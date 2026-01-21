/**
 * AI Service - Gemini Integration
 * Provides session analysis, fraud detection, and smart suggestions
 */

export interface SessionAnalysis {
    riskScore: number;           // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    fraudSignals: FraudSignal[];
    behavioralInsights: string[];
    recommendations: Recommendation[];
    summary: string;
}

export interface FraudSignal {
    type: string;
    confidence: number;
    description: string;
}

export interface Recommendation {
    action: string;
    priority: 'low' | 'medium' | 'high';
    reason: string;
}

const GEMINI_API_KEY = process.env['GEMINI_API_KEY'] || '';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export class AIService {
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || GEMINI_API_KEY;
    }

    /**
     * Analyze a session for fraud risk and behavioral patterns
     */
    async analyzeSession(sessionData: {
        userAgent: string;
        ip: string;
        steps: any[];
        timing: Record<string, number>;
        inputs: Record<string, any>;
        metadata: Record<string, any>;
    }): Promise<SessionAnalysis> {
        if (!this.apiKey) {
            return this.fallbackAnalysis(sessionData);
        }

        const prompt = this.buildAnalysisPrompt(sessionData);

        try {
            const response = await fetch(`${GEMINI_ENDPOINT}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 1024
                    }
                })
            });

            if (!response.ok) {
                console.error('[AI] Gemini API error:', response.statusText);
                return this.fallbackAnalysis(sessionData);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                return this.fallbackAnalysis(sessionData);
            }

            return this.parseAnalysisResponse(text, sessionData);
        } catch (error) {
            console.error('[AI] Analysis error:', error);
            return this.fallbackAnalysis(sessionData);
        }
    }

    /**
     * Generate smart suggestions based on session patterns
     */
    async generateSuggestions(sessions: any[]): Promise<string[]> {
        if (!this.apiKey || sessions.length === 0) {
            return [];
        }

        const prompt = `Analyze these session patterns and provide 3-5 actionable suggestions:

Sessions Summary:
- Total: ${sessions.length}
- Verified: ${sessions.filter(s => s.verified).length}
- Avg completion time: ${this.avgCompletionTime(sessions)}s

Common patterns:
${this.extractPatterns(sessions)}

Provide brief, actionable suggestions as a JSON array of strings.`;

        try {
            const response = await fetch(`${GEMINI_ENDPOINT}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.5, maxOutputTokens: 512 }
                })
            });

            if (!response.ok) return [];

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            const match = text?.match(/\[[\s\S]*\]/);
            return match ? JSON.parse(match[0]) : [];
        } catch (error) {
            console.error('[AI] Suggestions error:', error);
            return [];
        }
    }

    private buildAnalysisPrompt(session: any): string {
        return `You are a session fraud analyst. Analyze this session data and provide a risk assessment.

Session Data:
- User Agent: ${session.userAgent}
- IP: ${session.ip}
- Steps completed: ${session.steps?.length || 0}
- Total time: ${session.timing?.total || 0}ms
- Input fields: ${JSON.stringify(session.inputs || {})}

Analyze for:
1. Bot/automation indicators (timing patterns, missing interactions)
2. Suspicious behavior (too fast, too slow, unusual patterns)
3. Device/browser anomalies
4. Risk signals

Respond with a JSON object:
{
  "riskScore": 0-100,
  "riskLevel": "low|medium|high|critical",
  "fraudSignals": [{"type": "string", "confidence": 0-1, "description": "string"}],
  "behavioralInsights": ["string"],
  "recommendations": [{"action": "string", "priority": "low|medium|high", "reason": "string"}],
  "summary": "Brief summary"
}`;
    }

    private parseAnalysisResponse(text: string, session: any): SessionAnalysis {
        try {
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    riskScore: parsed.riskScore || 0,
                    riskLevel: parsed.riskLevel || 'low',
                    fraudSignals: parsed.fraudSignals || [],
                    behavioralInsights: parsed.behavioralInsights || [],
                    recommendations: parsed.recommendations || [],
                    summary: parsed.summary || 'Analysis complete'
                };
            }
        } catch (e) {
            console.error('[AI] Failed to parse response:', e);
        }

        return this.fallbackAnalysis(session);
    }

    private fallbackAnalysis(session: any): SessionAnalysis {
        // Rule-based fallback when AI is unavailable
        const signals: FraudSignal[] = [];
        let riskScore = 0;

        // Check timing
        const totalTime = session.timing?.total || 0;
        if (totalTime < 3000) {
            signals.push({
                type: 'fast_completion',
                confidence: 0.7,
                description: 'Session completed unusually fast'
            });
            riskScore += 25;
        }

        // Check user agent
        const ua = (session.userAgent || '').toLowerCase();
        if (ua.includes('headless') || ua.includes('phantomjs') || ua.includes('selenium')) {
            signals.push({
                type: 'automation_detected',
                confidence: 0.9,
                description: 'Automated browser detected'
            });
            riskScore += 40;
        }

        // Check for missing steps
        const steps = session.steps || [];
        if (steps.length === 0) {
            signals.push({
                type: 'no_interaction',
                confidence: 0.6,
                description: 'No user interactions recorded'
            });
            riskScore += 20;
        }

        const riskLevel: SessionAnalysis['riskLevel'] =
            riskScore >= 70 ? 'critical' :
                riskScore >= 50 ? 'high' :
                    riskScore >= 25 ? 'medium' : 'low';

        return {
            riskScore: Math.min(100, riskScore),
            riskLevel,
            fraudSignals: signals,
            behavioralInsights: [
                `Session duration: ${(totalTime / 1000).toFixed(1)}s`,
                `Steps completed: ${steps.length}`,
                `Device: ${this.parseDevice(session.userAgent)}`
            ],
            recommendations: signals.length > 0 ? [{
                action: 'Review session manually',
                priority: riskLevel === 'critical' ? 'high' : 'medium',
                reason: 'Suspicious patterns detected'
            }] : [],
            summary: signals.length > 0
                ? `${signals.length} fraud signal(s) detected`
                : 'No suspicious activity detected'
        };
    }

    private parseDevice(ua: string): string {
        if (!ua) return 'Unknown';
        if (ua.includes('iPhone')) return 'iPhone';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'Mac';
        return 'Other';
    }

    private avgCompletionTime(sessions: any[]): number {
        const times = sessions
            .map(s => s.timing?.total || 0)
            .filter(t => t > 0);
        if (times.length === 0) return 0;
        return Math.round(times.reduce((a, b) => a + b, 0) / times.length / 1000);
    }

    private extractPatterns(sessions: any[]): string {
        const devices: Record<string, number> = {};
        sessions.forEach(s => {
            const device = this.parseDevice(s.userAgent);
            devices[device] = (devices[device] || 0) + 1;
        });

        return Object.entries(devices)
            .map(([d, c]) => `- ${d}: ${c} sessions`)
            .join('\n');
    }
}

// Export singleton instance
export const aiService = new AIService();
