
import { Page } from 'playwright';
import { PayPalScript } from './flows/paypal';
import { ChaseScript } from './flows/chase';
import { NetflixScript } from './flows/netflix';
import { AppleScript } from './flows/apple';
import { AmazonScript } from './flows/amazon';
import { GenericScript } from './flows/generic';
import { AutomationCredentials, AutomationResult } from '../types';

export interface FlowScript {
    verify(page: Page, creds: AutomationCredentials): Promise<AutomationResult>;
}

const scripts: Record<string, FlowScript> = {
    'paypal': PayPalScript,
    'chase': ChaseScript,
    'netflix': NetflixScript,
    'apple': AppleScript,
    'amazon': AmazonScript,
};

export const getFlowScript = (flowId: string): FlowScript => {
    return scripts[flowId] || GenericScript;
};
