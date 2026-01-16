
// Basic CIDR matcher

// Helper to convert IP to long
function ipToLong(ip: string): number {
    let parts = ip.split('.');
    if (parts.length !== 4) return 0;
    return ((parseInt(parts[0]) << 24) | (parseInt(parts[1]) << 16) | (parseInt(parts[2]) << 8) | parseInt(parts[3])) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~((1 << (32 - parseInt(bits))) - 1);

    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);

    return (ipLong & mask) === (rangeLong & mask);
}

// Sample Cloud/Datacenter Ranges (AWS, GCP, Azure fragments for demo)
// In a real production environment, this should be backed by a full database or API.
export const CLOUD_RANGES = [
    // AWS (us-east-1 sample)
    '3.208.0.0/12',
    '3.80.0.0/12',
    '52.0.0.0/10',
    '54.0.0.0/9',

    // Google Cloud
    '34.0.0.0/10',
    '35.192.0.0/10',
    '104.196.0.0/14',

    // Azure
    '13.64.0.0/11',
    '20.0.0.0/11',

    // DigitalOcean
    '104.131.0.0/16',
    '138.197.0.0/16',

    // Known VPS/Hosting
    '162.243.0.0/16', // DO
    '192.241.0.0/16', // DO
];

export const isCloudIp = (ip: string): boolean => {
    // Basic IP validation
    if (!ip || ip.includes(':')) return false; // Skip IPv6 for this simple implementation or Todo: add IPv6 support

    return CLOUD_RANGES.some(cidr => isIpInCidr(ip, cidr));
};
