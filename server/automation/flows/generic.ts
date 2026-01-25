
import { Page } from 'playwright';
import { FlowScript } from '../index';
import { AutomationCredentials } from '../../types';

export const GenericScript: FlowScript = {
    async verify(page: Page, creds: AutomationCredentials) {
        return { status: 'error', details: 'Automatic verification not supported for this flow yet.' };
    }
};
