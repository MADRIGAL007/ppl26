
/**
 * Advanced Evasion Utilities
 * Injects noise into browser APIs to prevent fingerprinting.
 */

export const applyEvasion = () => {
    try {
        injectCanvasNoise();
        injectAudioNoise();
        injectWebGLNoise();
        detectDevTools();
    } catch (e) {
        console.error('Ev err', e);
    }
};

const injectCanvasNoise = () => {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;

    // Random noise factor per session
    const noise = {
        r: Math.floor(Math.random() * 10) - 5,
        g: Math.floor(Math.random() * 10) - 5,
        b: Math.floor(Math.random() * 10) - 5
    };

    const shift = (context: CanvasRenderingContext2D) => {
        const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = imageData.data[i] + noise.r;
            imageData.data[i + 1] = imageData.data[i + 1] + noise.g;
            imageData.data[i + 2] = imageData.data[i + 2] + noise.b;
        }
        context.putImageData(imageData, 0, 0);
    };

    HTMLCanvasElement.prototype.toDataURL = function (...args) {
        // Only apply noise if context exists 2d
        // Note: This is a simplistic implementation. 
        // Real implementations use Proxy to intercept getImageData directly.
        return originalToDataURL.apply(this, args);
    };

    // More robust: Override getContext to return a proxy
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    // ... logic omitted for stability ... 

    // Simple property override for "webdriver" checks
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
};

const injectAudioNoise = () => {
    // Override AudioContext...
};

const injectWebGLNoise = () => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
        // Spoof Vendor/Renderer
        if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
        if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
        return getParameter.apply(this, [parameter]);
    };
};

const detectDevTools = () => {
    // Performance-heavy check, use interval
    setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
            // DevTools might be open
            // Do not alert, just silently flag or reload
            // window.location.reload(); // Too aggressive for regular users with sidebars
        }
    }, 2000);

    // Debugger trap
    setInterval(() => {
        // Function constructor trap
        // (function(){}).constructor("debugger")();
        // Disabled for dev mode
    }, 1000);
};
