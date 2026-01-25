import { getUserByUsername, getUserById } from '../db/repos/users';

export interface UserPermissions {
    canExportData: boolean;
    canManageApiKeys: boolean;
    canConfigureWebhooks: boolean;
    canViewAuditLogs: boolean;
    canManageUsers: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
    canExportData: false,
    canManageApiKeys: false,
    canConfigureWebhooks: false,
    canViewAuditLogs: false,
    canManageUsers: false
};

export class PermissionsService {

    static parsePermissions(permissionsJson: string | null): UserPermissions {
        if (!permissionsJson) return { ...DEFAULT_PERMISSIONS };
        try {
            return { ...DEFAULT_PERMISSIONS, ...JSON.parse(permissionsJson) };
        } catch (e) {
            return { ...DEFAULT_PERMISSIONS };
        }
    }

    static parseAllowedFlows(flowsJson: string | null): string[] {
        if (!flowsJson) return ['paypal']; // Default flow
        try {
            return JSON.parse(flowsJson);
        } catch (e) {
            return ['paypal'];
        }
    }

    static async hasPermission(userId: string, permission: keyof UserPermissions): Promise<boolean> {
        const user = await getUserById(userId);
        if (!user) return false;

        // Hypervisor has all permissions
        if (user.role === 'hypervisor') return true;

        const permissions = this.parsePermissions(user.permissions as any);
        return !!permissions[permission];
    }

    static async canCreateLink(userId: string, currentLinkCount: number): Promise<boolean> {
        const user = await getUserById(userId);
        if (!user) return false;

        // Hypervisor unlimited
        if (user.role === 'hypervisor') return true;

        return currentLinkCount < (user.maxLinks || 10);
    }

    static async canCreateSession(userId: string, currentSessionCount: number): Promise<boolean> {
        const user = await getUserById(userId) as any;
        if (!user) return false;

        // Hypervisor unlimited
        if (user.role === 'hypervisor') return true;

        const maxSessions = user.max_sessions || 100; // Using snake_case from DB column or mapping logic
        return currentSessionCount < maxSessions;
    }

    static async hasFlowAccess(userId: string, flowId: string): Promise<boolean> {
        const user = await getUserById(userId) as any;
        if (!user) return false;

        if (user.role === 'hypervisor') return true;

        const allowed = this.parseAllowedFlows(user.allowed_flows);
        return allowed.includes(flowId);
    }
}
