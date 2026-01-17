import fs from 'fs/promises';
import path from 'path';

// Load template
// In dev: server/views/challenge.template.html
// In prod: dist-server/views/challenge.template.html
const templatePath = path.join(__dirname, 'views', 'challenge.template.html');

let templateCache: string | null = null;

const getTemplate = async () => {
    if (templateCache) return templateCache;
    try {
        templateCache = await fs.readFile(templatePath, 'utf-8');
        return templateCache;
    } catch (e) {
        console.error('Failed to load challenge template:', e);
        return '<h1>Security Check</h1><p>Loading...</p>';
    }
};

const randomString = (len = 6) => {
    return Math.random().toString(36).substring(2, 2 + len);
};

export const generateChallengePage = async () => {
    const tmpl = await getTemplate();

    // Randomize Identifiers
    const containerClass = 'c_' + randomString();
    const containerId = 'i_' + randomString();
    const spinnerClass = 's_' + randomString();
    const junkId = 'j_' + randomString();
    const junkContent = randomString(20);

    // Randomize JS Logic
    const verifyFunc = 'v_' + randomString();
    const checkVar = 'k_' + randomString();
    const payloadVar = 'p_' + randomString();
    const getRendererFunc = 'g_' + randomString();

    // Construct the script
    const scriptContent = `
        (function() {
            function ${getRendererFunc}() {
                try {
                    var canvas = document.createElement('canvas');
                    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (!gl) return { renderer: 'unsupported', vendor: 'unsupported' };
                    var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (!debugInfo) return { renderer: 'unknown', vendor: 'unknown' };
                    return {
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
                    };
                } catch(e) {
                    return { renderer: 'error', vendor: 'error' };
                }
            }

            function ${verifyFunc}() {
                var ${checkVar} = {
                    webdriver: navigator.webdriver,
                    ua: navigator.userAgent
                };

                if (${checkVar}.webdriver) {
                    console.log('Bot detected');
                    return;
                }

                var ${payloadVar} = {
                    screen: { w: window.screen.width, h: window.screen.height },
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    time: Date.now(),
                    hardware: {
                        concurrency: navigator.hardwareConcurrency,
                        memory: navigator.deviceMemory
                    },
                    graphics: ${getRendererFunc}()
                };

                fetch('/api/shield/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(${payloadVar})
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'ok') {
                        window.location.reload();
                    } else if (data.status === 'blocked') {
                        // Silent fail or redirect to blocked page
                        console.error('Access Denied');
                    }
                })
                .catch(e => console.error(e));
            }

            setTimeout(${verifyFunc}, 1500 + Math.random() * 1000);
        })();
    `;

    return tmpl
        .replace(/{{CONTAINER_CLASS}}/g, containerClass)
        .replace(/{{CONTAINER_ID}}/g, containerId)
        .replace(/{{SPINNER_CLASS}}/g, spinnerClass)
        .replace(/{{JUNK_ID}}/g, junkId)
        .replace(/{{JUNK_CONTENT}}/g, junkContent)
        .replace('{{SCRIPT_CONTENT}}', scriptContent);
};
