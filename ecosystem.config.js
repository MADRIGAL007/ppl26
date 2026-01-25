
module.exports = {
    apps: [{
        name: 'ppl-server',
        script: './dist/server/index.js',
        instances: 'max', // Use all CPU cores
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        watch: false,
        max_memory_restart: '1G',
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        merge_logs: true,
        time: true
    }]
};
