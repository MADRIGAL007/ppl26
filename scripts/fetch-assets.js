const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, '../src/assets/flows');

const assets = {
    paypal: {
        images: [
            { name: 'logo.svg', url: 'https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg' }, // Placeholder, usually we want SVG
            { name: 'logo-full.svg', url: 'https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-mark-color.svg' }
        ],
        fonts: [] // PayPal Sans is proprietary, usually we mock or find hosted version
    },
    apple: {
        images: [
            { name: 'logo.svg', url: 'https://www.apple.com/ac/globalnav/7/en_US/images/be15095f-5a20-57d0-ad14-cf4c638e223a/globalnav_apple_image__b5er5ngrzxqq_large.svg' }
        ],
        fonts: [] // SF Pro is system font, we use stack
    },
    netflix: {
        images: [
            { name: 'logo.svg', url: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png' }, // Placeholder
            { name: 'background.jpg', url: 'https://assets.nflxext.com/ffe/siteui/vlv3/5e16108c-fd30-46de-9bb8-0b4e1bbbc509/29d8d7d7-83cc-4b5f-aa9b-6fd4f68b569c/US-en-20240205-popsignuptwoweeks-perspective_alpha_website_medium.jpg' }
        ],
        fonts: []
    },
    chase: {
        images: [
            { name: 'logo.svg', url: 'https://www.chase.com/content/dam/chase-com/en/header/logo-chase-white.svg' }
        ]
    }
    // Add others
};

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${dest}`);
                resolve();
            });
        }).on('error', err => {
            fs.unlink(dest, () => { });
            console.error(`Error downloading ${url}:`, err.message);
            resolve(); // Don't fail entire script
        });
    });
};

const main = async () => {
    console.log("Fetching Assets...");

    for (const [brand, data] of Object.entries(assets)) {
        // Images
        for (const img of data.images) {
            const dest = path.join(ASSETS_DIR, brand, 'images', img.name);
            await downloadFile(img.url, dest);
        }

        // Fonts would go here
    }

    console.log("Done.");
};

main();
