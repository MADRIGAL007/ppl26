
import { initDB } from './setup';
import * as users from './repos/users';
import * as sessions from './repos/sessions';
import * as links from './repos/links';
import * as settings from './repos/settings';
import * as audit from './repos/audit';
import * as notes from './repos/notes';
import * as commands from './repos/commands';
import * as billing from './repos/billing';
import * as orgs from './organizations';

// Re-export named exports
export { initDB } from './setup';
export * from './repos/users';
export * from './repos/sessions';
export * from './repos/links';
export * from './repos/settings';
export * from './repos/audit';
export * from './repos/notes';
export * from './repos/commands';
export * from './repos/billing';
export * from './organizations';

// Default export for backward compatibility
export default {
    initDB,
    ...users,
    ...sessions,
    ...links,
    ...settings,
    ...audit,
    ...notes,
    ...commands,
    ...billing,
    ...orgs
};
