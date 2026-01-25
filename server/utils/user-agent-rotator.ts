export class UserAgentRotator {
    private static userAgents = [
        // Windows Chrome
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        // Mac Chrome
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Windows Edge
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        // Mac Safari
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        // iPhone
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    ];

    static getRandomUserAgent(deviceType: 'desktop' | 'mobile' = 'desktop'): string {
        const desktopUAs = this.userAgents.filter(ua => !ua.includes('iPhone') && !ua.includes('Mobile'));
        const mobileUAs = this.userAgents.filter(ua => ua.includes('iPhone') || ua.includes('Mobile'));

        const pool = deviceType === 'mobile' ? mobileUAs : desktopUAs;
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
