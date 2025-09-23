#!/usr/bin/env node

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import axios from 'axios';
import FormData from 'form-data';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import readline from 'readline-sync';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { v4 as uuidv4 } from 'uuid';
import qrcode from 'qrcode-terminal';
import moment from 'moment';
import nodeCron from 'node-cron';
import fs from 'fs';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WhatsAppUnlimitedBot {
    constructor() {
        this.sessionId = uuidv4();
        this.reportCount = 0;
        this.successCount = 0;
        this.isRunning = false;
        this.proxyAgent = null;
        this.sock = null;
        this.premiumUsers = new Set();
        this.proxyList = [];
        this.currentProxyIndex = 0;
        this.concurrentWorkers = 10;
        this.unlimitedMode = true;
        this.delayBetweenRequests = 0;
        this.botnetReports = [];
        this.tiktokReports = [];
        this.loadingStates = new Map();
        this.isTermux = process.env.TERMUX_VERSION !== undefined;
        
        this.mode = process.argv[2] || '--contact';
        
        this.config = {
            ownerNumber: '628999859595',
            sessionFolder: 'session',
            botName: '🤖 LORDHOZOO UNLIMITED BOT v8.0',
            usePairingCode: false, // Set true untuk menggunakan pairing code
            bannerImage: 'hozoo.jpg',
            contactEmail: 'lordhozoo8@gmail.com',
            maxConcurrent: 15,
            timeout: 30000,
            proxySources: [
                'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=protocolipport&format=text',
                'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
                'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
                'https://www.proxy-list.download/api/v1/get?type=http'
            ],
            tiktokApiEndpoints: [
                'https://www.tiktok.com/api/report/',
                'https://www.tiktok.com/aweme/v1/aweme/feedback/'
            ]
        };

        this.tiktokConfig = {
            maxConcurrent: 5,
            delayBetweenRequests: 100,
            maxRetries: 3,
            userAgents: [
                'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
            ],
            reportReasons: [
                'Spam or misleading',
                'Bullying or harassment',
                'Illegal activities'
            ]
        };

        this.menuConfig = {
            version: '8.0.0',
            lastUpdate: '2024-12-23',
            features: [
                '🤖 Auto Reply System',
                '📊 Mass Reporting',
                '🌐 Proxy Rotation',
                '📱 TikTok Mass Report',
                '⚡ Unlimited Mode',
                '📱 Termux Support',
                '🔧 Enhanced HTTP Headers',
                '🌍 Multi-Device Support',
                '🔐 Pairing Code & QR System'
            ]
        };

        // Enhanced HTTP Headers Collection
        this.httpHeaders = {
            'desktop': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            'mobile': {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            'api': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://web.whatsapp.com',
                'Referer': 'https://web.whatsapp.com/',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        // Enhanced WhatsApp endpoints dengan headers lengkap
        this.whatsappEndpoints = [
            {
                url: 'https://www.whatsapp.com/contact',
                method: 'POST',
                headers: 'desktop',
                dataType: 'form'
            },
            {
                url: 'https://api.whatsapp.com/support',
                method: 'POST', 
                headers: 'api',
                dataType: 'json'
            },
            {
                url: 'https://web.whatsapp.com/api/support',
                method: 'POST',
                headers: 'api',
                dataType: 'json'
            },
            {
                url: 'https://faq.whatsapp.com/api/contact',
                method: 'POST',
                headers: 'api',
                dataType: 'json'
            }
        ];

        // Enhanced device profiles
        this.deviceProfiles = [
            {
                name: 'Samsung Galaxy S23 Ultra',
                userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
                resolution: '1440x3088',
                viewport: '412x915',
                platform: 'Android',
                type: 'mobile'
            },
            {
                name: 'iPhone 14 Pro Max',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
                resolution: '1290x2796',
                viewport: '430x932',
                platform: 'iOS',
                type: 'mobile'
            },
            {
                name: 'Windows Chrome Desktop',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                resolution: '1920x1080',
                viewport: '1920x1080',
                platform: 'Windows',
                type: 'desktop'
            },
            {
                name: 'MacBook Safari',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
                resolution: '2560x1600',
                viewport: '2560x1600',
                platform: 'macOS',
                type: 'desktop'
            }
        ];

        // Enhanced contact templates
        this.contactTemplates = [
            {
                subject: 'Phone Number Activation Issue',
                category: 'account_help',
                message: 'Dear WhatsApp Support, I am having issues activating my WhatsApp account with phone number ${phone}. The verification code is not being received properly. Please assist me in resolving this activation problem.',
                language: 'en'
            },
            {
                subject: 'Problem dengan Aktivasi Nomor',
                category: 'account_help', 
                message: 'Kepada Tim Support WhatsApp, saya mengalami kendala dalam mengaktifkan akun WhatsApp dengan nomor ${phone}. Kode verifikasi tidak terkirim dengan baik. Mohon bantuan untuk menyelesaikan masalah ini.',
                language: 'id'
            },
            {
                subject: 'Account Security Concern',
                category: 'security',
                message: 'Hello WhatsApp Team, I have concerns about the security of my account with number ${phone}. I suspect there might be unauthorized access attempts. Please advise on security measures.',
                language: 'en'
            },
            {
                subject: 'Laporan Masalah Teknis',
                category: 'technical',
                message: 'Kepada Yth. Support WhatsApp, saya mengalami masalah teknis dengan aplikasi WhatsApp di nomor ${phone}. Aplikasi sering crash dan tidak bisa menerima pesan. Mohon bantuan teknisnya.',
                language: 'id'
            }
        ];

        this.init().catch(error => {
            console.error(chalk.red('❌ Initialization error:'), error);
        });
    }

    async init() {
        try {
            await this.showEnhancedBanner();
            await this.loadProxyList();
            await this.loadTikTokReports();
            
            if (this.isTermux) {
                console.log(chalk.green('📱 TERMUX ENVIRONMENT DETECTED - Optimizing for mobile...'));
                this.optimizeForTermux();
            }
            
            // Tanya metode koneksi
            await this.askConnectionMethod();
            
            switch(this.mode) {
                case '--bot':
                    await this.startBotMode();
                    break;
                case '--tiktok':
                    await this.startTikTokMode();
                    break;
                case '--report':
                    await this.startReportMode();
                    break;
                case '--unlimited':
                    await this.startUnlimitedMode();
                    break;
                case '--contact':
                default:
                    await this.startInteractiveMode();
            }
        } catch (error) {
            console.error(chalk.red('❌ Initialization failed:'), error);
        }
    }

    // ==================== ENHANCED CONNECTION METHOD ====================
    async askConnectionMethod() {
        console.log(chalk.cyan('\n🔐 Pilih metode koneksi WhatsApp:'));
        console.log('1. QR Code (Recommended)');
        console.log('2. Pairing Code');
        
        const choice = readline.question('Pilih (1-2): ');
        this.config.usePairingCode = (choice === '2');
        
        if (this.config.usePairingCode) {
            const nomor = readline.question('📱 Masukkan nomor WhatsApp (62xxx): ');
            if (nomor) {
                this.config.ownerNumber = nomor.trim();
            }
        }
    }

    async showEnhancedBanner() {
        console.log(chalk.green(`
╔══════════════════════════════════════════════════════════════╗
║                   🦊 LORDHOZOO UNLIMITED BOT v8.0           ║
║               ENHANCED CONNECTION SYSTEM EDITION            ║
║               WHATSAPP + TIKTOK + UNLIMITED MODE            ║
╠══════════════════════════════════════════════════════════════╣
║ 📅 Date      : ${moment().format('DD/MM/YYYY HH:mm:ss')}              ║
║ 👑 Owner     : ${this.config.ownerNumber}                   ║
║ 🌐 Proxies   : ${this.proxyList.length} loaded                        ║
║ ⚡ Mode      : ${this.mode.toUpperCase().replace('--', '')} - ENHANCED      ║
║ 🔧 Platform  : ${this.isTermux ? 'Termux' : 'Desktop'}                 ║
║ 🔐 Login     : ${this.config.usePairingCode ? 'Pairing Code' : 'QR Code'} ║
╚══════════════════════════════════════════════════════════════╝
        `));
    }

    // ==================== ENHANCED PROXY MANAGEMENT ====================
    async loadProxyList() {
        console.log(chalk.cyan('\n🔍 LOADING ENHANCED PROXY LIST...'));
        
        const progressBar = new cliProgress.SingleBar({
            format: '📡 Loading Proxies |{bar}| {percentage}% | {value}/{total} Sources',
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true
        });

        progressBar.start(this.config.proxySources.length, 0);

        for (let i = 0; i < this.config.proxySources.length; i++) {
            try {
                const response = await axios.get(this.config.proxySources[i], { 
                    timeout: 10000,
                    headers: this.httpHeaders.desktop
                });
                
                const proxies = response.data.split('\n')
                    .map(proxy => proxy.trim())
                    .filter(proxy => {
                        const proxyRegex = /^(\d{1,3}\.){3}\d{1,3}:\d{1,5}$/;
                        return proxy && proxyRegex.test(proxy);
                    });
                
                this.proxyList.push(...proxies);
                console.log(chalk.green(`✅ Source ${i+1}: ${proxies.length} proxies`));
            } catch (error) {
                console.log(chalk.yellow(`⚠️  Failed source ${i+1}: ${error.message}`));
            }
            progressBar.update(i + 1);
        }

        progressBar.stop();

        // Remove duplicates and shuffle
        this.proxyList = [...new Set(this.proxyList)];
        this.shuffleArray(this.proxyList);
        
        console.log(chalk.green(`📊 Total ${this.proxyList.length} unique proxies loaded`));
    }

    getRandomProxy() {
        if (this.proxyList.length === 0) return null;
        return this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
    }

    getNextProxy() {
        if (this.proxyList.length === 0) return null;
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
        return this.proxyList[this.currentProxyIndex];
    }

    getProxyAgent(proxy) {
        if (!proxy) return null;
        
        try {
            if (proxy.startsWith('socks')) {
                return new SocksProxyAgent(proxy);
            } else {
                return new HttpsProxyAgent(`http://${proxy}`);
            }
        } catch (error) {
            return null;
        }
    }

    // ==================== ENHANCED WHATSAPP BOT WITH PAIRING CODE ====================
    async startBotMode() {
        console.log(chalk.cyan('\n🤖 STARTING ENHANCED WHATSAPP BOT...'));
        
        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.config.sessionFolder);
            
            const { version } = await fetchLatestBaileysVersion();
            console.log(chalk.green(`✅ Using WA v${version.join('.')}`));

            const socketConfig = {
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: !this.config.usePairingCode,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
                },
                generateHighQualityLinkPreview: true,
                browser: ['Ubuntu', 'Chrome', '120.0'],
                getMessage: async (key) => {
                    return {
                        conversation: 'Hello from LordHozoo Unlimited Bot'
                    };
                }
            };

            this.sock = makeWASocket(socketConfig);

            this.sock.ev.on('creds.update', saveCreds);

            // Handle pairing code jika dipilih
            if (this.config.usePairingCode && !this.sock.authState.creds.registered) {
                await this.handlePairingCode();
            }

            this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
            this.sock.ev.on('messages.upsert', this.handleMessagesUpsert.bind(this));

        } catch (error) {
            console.error(chalk.red('❌ Bot startup error:'), error);
            this.retryConnection();
        }
    }

    async handlePairingCode() {
        try {
            console.log(chalk.yellow('\n🔐 MEMPROSES PAIRING CODE...'));
            
            if (!this.config.ownerNumber || this.config.ownerNumber === '628xxxxxxxxxx') {
                const nomor = readline.question('📱 Masukkan nomor WhatsApp (62xxx): ');
                if (!nomor) {
                    console.log(chalk.red('❌ Nomor tidak boleh kosong!'));
                    return this.askConnectionMethod();
                }
                this.config.ownerNumber = nomor.trim();
            }

            console.log(chalk.cyan(`📞 Meminta pairing code untuk: ${this.config.ownerNumber}`));
            
            const code = await this.sock.requestPairingCode(this.config.ownerNumber);
            const formattedCode = code.match(/.{1,4}/g)?.join(' - ') || code;
            
            console.log(chalk.green('\n✅ PAIRING CODE BERHASIL DIBUAT!'));
            console.log(chalk.yellow('📋 Kode Pairing:'), chalk.white.bgBlue.bold(` ${formattedCode} `));
            console.log(chalk.cyan('💡 Instruksi:'));
            console.log(chalk.cyan('1. Buka WhatsApp di HP Anda'));
            console.log(chalk.cyan('2. Pergi ke Settings → Linked Devices → Link a Device'));
            console.log(chalk.cyan('3. Masukkan kode pairing di atas'));
            console.log(chalk.cyan('4. Tunggu hingga terhubung...\n'));

        } catch (error) {
            console.error(chalk.red('❌ Error generating pairing code:'), error.message);
            console.log(chalk.yellow('🔄 Fallback ke QR Code...'));
            this.config.usePairingCode = false;
            await this.startBotMode();
        }
    }

    handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr, isNewLogin } = update;
        
        if (qr && !this.config.usePairingCode) {
            console.log(chalk.yellow('\n📱 SCAN QR CODE DI BAWAH INI:'));
            console.log(chalk.cyan('💡 Buka WhatsApp → Settings → Linked Devices → Scan QR Code\n'));
            qrcode.generate(qr, { 
                small: true,
                scale: 2
            });
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.yellow(`\n🔌 Connection closed - Status: ${statusCode || 'Unknown'}`));
            console.log(chalk.yellow(`🔄 Reconnecting: ${shouldReconnect ? 'Yes' : 'No'}`));
            
            if (shouldReconnect) {
                setTimeout(() => {
                    console.log(chalk.cyan('🔄 Attempting to reconnect...'));
                    this.startBotMode();
                }, 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green('\n✅ WHATSAPP BOT CONNECTED SUCCESSFULLY!'));
            console.log(chalk.cyan(`🤖 Bot Name: ${this.config.botName}`));
            console.log(chalk.cyan(`👑 Owner: ${this.config.ownerNumber}`));
            console.log(chalk.cyan(`🕒 Connected at: ${moment().format('DD/MM/YYYY HH:mm:ss')}`));
            
            this.sendBotMessage(this.config.ownerNumber + '@s.whatsapp.net', 
                `🤖 *${this.config.botName}*\n` +
                `✅ Connected successfully!\n` +
                `🕒 ${moment().format('DD/MM/YYYY HH:mm:ss')}\n` +
                `🌐 Mode: ${this.mode}`
            );
        }
        
        // Handle new login
        if (isNewLogin) {
            console.log(chalk.green('🆕 New login detected!'));
        }
    }

    retryConnection() {
        console.log(chalk.yellow('🔄 Retrying connection in 10 seconds...'));
        setTimeout(() => {
            this.startBotMode();
        }, 10000);
    }

    // ==================== MESSAGE HANDLER ====================
    async handleMessagesUpsert({ messages }) {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

            const jid = msg.key.remoteJid;
            const userNumber = jid.split('@')[0];
            const messageText = msg.message.conversation || 
                              msg.message.extendedTextMessage?.text || 
                              msg.message.buttonsResponseMessage?.selectedButtonId || 
                              '';

            // Debug log
            console.log(chalk.cyan(`📩 Message from: ${userNumber}`));
            console.log(chalk.cyan(`💬 Content: ${messageText.substring(0, 50)}...`));

            if (messageText.startsWith('!')) {
                await this.handleBotCommand(jid, userNumber, messageText);
            } else if (messageText.toLowerCase().includes('ping')) {
                await this.sendBotMessage(jid, '🏓 Pong! Bot is active and ready.');
            }

        } catch (error) {
            console.error(chalk.red('❌ Error handling message:'), error);
        }
    }

    async handleBotCommand(jid, userNumber, command) {
        const isOwner = userNumber === this.config.ownerNumber.replace(/\D/g, '');
        
        console.log(chalk.yellow(`🔧 Command received: ${command} from ${userNumber}`));

        if (command.startsWith('!tiktok')) {
            await this.handleTikTokCommand(jid, userNumber, command);
        } else if (command === '!menu') {
            await this.showEnhancedMenu(jid, userNumber, isOwner);
        } else if (command === '!ping') {
            await this.sendBotMessage(jid, '🏓 Pong! Bot is active and responsive.');
        } else if (command === '!status') {
            await this.showBotStatus(jid);
        } else if (command === '!unlimited') {
            await this.handleUnlimitedCommand(jid, userNumber, command);
        } else if (command === '!restart') {
            await this.handleRestartCommand(jid, userNumber, isOwner);
        } else if (command === '!connection') {
            await this.showConnectionInfo(jid);
        } else {
            await this.sendBotMessage(jid, 
                '❌ Command tidak dikenali.\n' +
                '📋 Ketik !menu untuk melihat daftar command yang tersedia.'
            );
        }
    }

    async handleRestartCommand(jid, userNumber, isOwner) {
        if (!isOwner) {
            await this.sendBotMessage(jid, '❌ Command ini hanya untuk owner!');
            return;
        }

        await this.sendBotMessage(jid, '🔄 Restarting bot...');
        console.log(chalk.yellow('🔄 Restarting bot by owner command...'));
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    }

    async showConnectionInfo(jid) {
        const connectionInfo = `
🔐 *CONNECTION INFORMATION*

📱 Connection Method: ${this.config.usePairingCode ? 'Pairing Code' : 'QR Code'}
👑 Owner Number: ${this.config.ownerNumber}
🕒 Session Started: ${moment().format('DD/MM/YYYY HH:mm:ss')}
🌐 Proxies Available: ${this.proxyList.length}
📊 Messages Processed: ${this.successCount}

💡 *Status*: ✅ Connected and Active
        `.trim();

        await this.sendBotMessage(jid, connectionInfo);
    }

    // ==================== TIKTOK MASS REPORT SYSTEM ====================
    async startTikTokMode() {
        console.log(chalk.red('\n📱 TIKTOK MASS REPORT SYSTEM AKTIF'));
        
        const targetType = readline.question('🎯 Pilih jenis target:\n1. Username (@)\n2. Link Video\nPilih (1-2): ');
        
        let target = '';
        switch(targetType) {
            case '1':
                target = readline.question('👤 Masukkan username TikTok (@): ').replace('@', '');
                break;
            case '2':
                target = readline.question('🎥 Masukkan link video TikTok: ');
                break;
            default:
                console.log(chalk.red('❌ Pilihan tidak valid!'));
                return;
        }
        
        const reportCount = parseInt(readline.question('🔢 Jumlah laporan: ')) || 100;
        
        console.log(chalk.cyan(`\n🚀 Memulai TikTok mass report...`));
        console.log(chalk.cyan(`🎯 Target: ${target}`));
        console.log(chalk.cyan(`📊 Jumlah: ${reportCount}`));
        console.log(chalk.cyan(`🌐 Proxies: ${this.proxyList.length} available`));
        
        await this.executeTikTokMassReport(target, targetType, reportCount);
    }

    async executeTikTokMassReport(target, targetType, maxReports) {
        const progressBar = new cliProgress.SingleBar({
            format: '📱 TikTok Report |{bar}| {percentage}% | {value}/{total}',
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true
        });

        progressBar.start(maxReports, 0);
        
        let successfulReports = 0;
        let failedReports = 0;
        let startTime = Date.now();
        
        const reportWorker = async () => {
            while (successfulReports + failedReports < maxReports) {
                try {
                    const proxy = this.getNextProxy();
                    const success = await this.sendTikTokReport(target, targetType, proxy);
                    
                    if (success) {
                        successfulReports++;
                    } else {
                        failedReports++;
                    }
                    
                    progressBar.update(successfulReports + failedReports);
                    
                    await new Promise(resolve => setTimeout(resolve, this.tiktokConfig.delayBetweenRequests));
                    
                } catch (error) {
                    failedReports++;
                }
            }
        };

        const workers = [];
        const workerCount = Math.min(this.tiktokConfig.maxConcurrent, maxReports);
        
        for (let i = 0; i < workerCount; i++) {
            workers.push(reportWorker());
        }
        
        await Promise.all(workers);
        progressBar.stop();
        
        const totalTime = (Date.now() - startTime) / 1000;
        console.log(chalk.green(`\n✅ TikTok mass report completed!`));
        console.log(chalk.cyan(`📊 Success: ${successfulReports} | Failed: ${failedReports}`));
        console.log(chalk.cyan(`⏱️  Time: ${totalTime.toFixed(1)}s`));
    }

    // ... (rest of the methods remain the same as previous version)

    async sendBotMessage(jid, text) {
        try {
            if (this.sock) {
                await this.sock.sendMessage(jid, { text: text });
                this.successCount++;
            }
        } catch (error) {
            console.error(chalk.red('❌ Error sending message:'), error);
        }
    }

    // ==================== UTILITY FUNCTIONS ====================
    generateRandomIP() {
        return `123.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    generateRandomPhone() {
        const prefixes = ['812', '813', '814', '815', '816', '817', '818', '819', '821', '822', '823', '851', '852', '853', '878'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = Array.from({length: 7}, () => Math.floor(Math.random() * 10)).join('');
        return `+62${prefix}${suffix}`;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // ==================== TERMUX OPTIMIZATION ====================
    optimizeForTermux() {
        if (!this.isTermux) return;
        
        this.tiktokConfig.maxConcurrent = 3;
        this.tiktokConfig.delayBetweenRequests = 200;
        this.config.maxConcurrent = 8;
        
        console.log(chalk.yellow('📱 Termux optimization applied'));
    }

    // ==================== OTHER MODES ====================
    async startInteractiveMode() {
        console.log(chalk.cyan('\n🎮 INTERACTIVE MODE'));
        
        const choice = readline.question('Pilih mode:\n1. WhatsApp Bot\n2. TikTok Mass Report\n3. Unlimited Mode\n4. Contact Mode\nPilih (1-4): ');
        
        switch(choice) {
            case '1':
                await this.startBotMode();
                break;
            case '2':
                await this.startTikTokMode();
                break;
            case '3':
                await this.startUnlimitedMode();
                break;
            case '4':
                await this.startContactMode();
                break;
            default:
                console.log(chalk.red('Pilihan tidak valid!'));
                process.exit(1);
        }
    }

    // ... (other methods remain the same)
}

// Global error handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
});

// Run the application 
new WhatsAppUnlimitedBot();
