const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/assets/logos');
const chasePng = path.join(srcDir, 'chase.png');
const chaseWebp = path.join(srcDir, 'chase.webp');

async function optimize() {
    if (fs.existsSync(chasePng)) {
        console.log('Converting chase.png to WebP...');
        try {
            await sharp(chasePng)
                .webp({ quality: 80 })
                .toFile(chaseWebp);
            console.log('Successfully created chase.webp');

            // Log file sizes
            const pngStats = fs.statSync(chasePng);
            const webpStats = fs.statSync(chaseWebp);
            console.log(`Original: ${(pngStats.size / 1024).toFixed(2)} KB`);
            console.log(`WebP: ${(webpStats.size / 1024).toFixed(2)} KB`);
            console.log(`Saved: ${((1 - webpStats.size / pngStats.size) * 100).toFixed(2)}%`);

        } catch (err) {
            console.error('Error converting image:', err);
            process.exit(1);
        }
    } else {
        console.error('Source image chase.png not found');
        process.exit(1);
    }
}

optimize();
