// Pi Network Payment Service - CORRECTED VERSION
// Uses proper Pi SDK client-side authentication and payment flow

(function() {
    'use strict';
    
    // Pi Payment Configuration
    const PI_CONFIG = {
        version: "2.0",
        sandbox: false, // Set to true for testing
        serverApprovalEndpoint: '/api/pi-approve',
        serverCompletionEndpoint: '/api/pi-complete'
    };

    class PiPaymentService {
        constructor() {
            this.isInitialized = false;
            this.isAuthenticated = false;
            this.authData = null;
            this.isPiBrowser = this.detectPiBrowser();
            this.userUid = null;
        }

        // Enhanced Pi Browser detection
        detectPiBrowser() {
            const userAgent = navigator.userAgent || '';
            const hostname = window.location.hostname;
            
            const isPi = userAgent.includes('PiBrowser') || 
                        userAgent.includes('Pi Browser') ||
                        hostname.includes('pinet.com') ||
                        (typeof Pi !== 'undefined');
            
            console.log('🔍 Pi Browser detection:', { 
                userAgent: userAgent.substring(0, 100) + '...', 
                hostname,
                isPi,
                hasPiSdk: typeof Pi !== 'undefined'
            });
            
            return isPi;
        }

        // Initialize Pi SDK properly
        async init() {
            try {
                console.log('🚀 Initializing Pi Payment Service...');

                // Check if Pi SDK is available
                if (typeof Pi === 'undefined') {
                    throw new Error('Pi SDK not available. Make sure you are in Pi Browser.');
                }

                // Initialize Pi SDK
                Pi.init({ 
                    version: PI_CONFIG.version,
                    sandbox: PI_CONFIG.sandbox 
                });

                console.log('✅ Pi SDK initialized');
                this.isInitialized = true;

                return { success: true, message: 'Pi SDK initialized' };

            } catch (error) {
                console.error('❌ Pi SDK initialization failed:', error);
                this.isInitialized = false;
                return { success: false, error: error.message };
            }
        }

        // Authenticate with Pi Network
        async authenticate() {
            try {
                console.log('🔐 Authenticating with Pi Network...');

                if (!this.isInitialized) {
                    await this.init();
                }

                if (typeof Pi === 'undefined') {
                    throw new Error('Pi SDK not available');
                }

                // Authenticate with Pi Network
                const authResult = await Pi.authenticate(
                    ['payments'], // Required scopes
                    this.onIncompletePaymentFound.bind(this) // Callback for incomplete payments
                );

                console.log('✅ Pi authentication successful:', authResult);

                this.isAuthenticated = true;
                this.authData = authResult;
                this.userUid = authResult.user.uid;

                if (typeof window.addNotification === 'function') {
                    window.addNotification('✅ Connected to Pi Network!', 'success');
                }

                return { 
                    success: true, 
                    authResult: authResult,
                    message: 'Pi Network authentication successful'
                };

            } catch (error) {
                console.error('❌ Pi authentication failed:', error);
                this.isAuthenticated = false;
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification('❌ Pi Network authentication failed', 'error');
                }

                return { success: false, error: error.message };
            }
        }

        // Handle incomplete payments found during authentication
        onIncompletePaymentFound(payment) {
            console.log('⚠️ Incomplete payment found:', payment);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('⚠️ You have an incomplete Pi payment', 'info');
            }

            // Complete the payment if possible
            this.handleIncompletePayment(payment);
        }

        // Handle incomplete payment
        async handleIncompletePayment(payment) {
            try {
                console.log('🔄 Handling incomplete payment:', payment.identifier);
                
                // Try to complete the payment
                if (payment.transaction && payment.transaction.txid && !payment.status.developer_completed) {
                    await this.completePayment(payment.identifier, payment.transaction.txid);
                }
            } catch (error) {
                console.error('❌ Error handling incomplete payment:', error);
            }
        }

        // Create a real Pi Network payment
        async createPayment(amount, memo, metadata = {}) {
            try {
                console.log('💰 Creating Pi Network payment:', { amount, memo, metadata });

                // Ensure authentication
                if (!this.isAuthenticated) {
                    const authResult = await this.authenticate();
                    if (!authResult.success) {
                        throw new Error('Authentication required');
                    }
                }

                if (typeof Pi === 'undefined') {
                    throw new Error('Pi SDK not available');
                }

                if (typeof window.addNotification === 'function') {
                    window.addNotification('💰 Creating Pi payment...', 'info');
                }

                // Create the payment using Pi SDK
                const payment = await new Promise((resolve, reject) => {
                    Pi.createPayment({
                        amount: parseFloat(amount),
                        memo: memo,
                        metadata: {
                            ...metadata,
                            clientTimestamp: Date.now(),
                            gameVersion: '1.0.0'
                        }
                    }, {
                        // Server-side approval callback
                        onReadyForServerApproval: async (paymentId) => {
                            console.log('💡 Payment ready for server approval:', paymentId);
                            
                            try {
                                await this.approvePayment(paymentId);
                                console.log('✅ Payment approved');
                            } catch (error) {
                                console.error('❌ Payment approval failed:', error);
                                reject(error);
                            }
                        },

                        // Server-side completion callback
                        onReadyForServerCompletion: async (paymentId, txid) => {
                            console.log('🎉 Payment ready for completion:', paymentId, txid);
                            
                            try {
                                const completedPayment = await this.completePayment(paymentId, txid);
                                console.log('✅ Payment completed:', completedPayment);
                                
                                // Process the purchase
                                this.onPaymentCompleted(completedPayment);
                                
                                resolve(completedPayment);
                            } catch (error) {
                                console.error('❌ Payment completion failed:', error);
                                reject(error);
                            }
                        },

                        // Payment cancelled
                        onCancel: (paymentId) => {
                            console.log('❌ Payment cancelled:', paymentId);
                            
                            if (typeof window.addNotification === 'function') {
                                window.addNotification('❌ Payment cancelled', 'error');
                            }
                            
                            reject(new Error('Payment cancelled by user'));
                        },

                        // Payment error
                        onError: (error, payment) => {
                            console.error('❌ Payment error:', error, payment);
                            
                            if (typeof window.addNotification === 'function') {
                                window.addNotification('❌ Payment error: ' + error.message, 'error');
                            }
                            
                            reject(error);
                        }
                    });
                });

                return payment;

            } catch (error) {
                console.error('❌ Payment creation failed:', error);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification('❌ Payment failed: ' + error.message, 'error');
                }
                
                throw error;
            }
        }

        // Server-side payment approval
        async approvePayment(paymentId) {
            try {
                console.log('📋 Approving payment on server:', paymentId);

                const response = await fetch(PI_CONFIG.serverApprovalEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentId: paymentId
                    })
                });

                if (!response.ok) {
                    throw new Error(`Server approval failed: ${response.status}`);
                }

                const result = await response.json();
                console.log('✅ Payment approved by server:', result);

                return result;

            } catch (error) {
                console.error('❌ Server approval failed:', error);
                throw error;
            }
        }

        // Server-side payment completion
        async completePayment(paymentId, txid) {
            try {
                console.log('🎯 Completing payment on server:', paymentId, txid);

                const response = await fetch(PI_CONFIG.serverCompletionEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentId: paymentId,
                        txid: txid
                    })
                });

                if (!response.ok) {
                    throw new Error(`Server completion failed: ${response.status}`);
                }

                const result = await response.json();
                console.log('✅ Payment completed by server:', result);

                return result;

            } catch (error) {
                console.error('❌ Server completion failed:', error);
                throw error;
            }
        }

        // Handle completed payment
        onPaymentCompleted(payment) {
            console.log('🎉 Payment completed successfully:', payment);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('🎉 Pi payment completed!', 'success');
            }

            // Process the purchase
            this.processPurchase(payment);
        }

        // Process purchase based on metadata
        processPurchase(payment) {
            try {
                const metadata = payment.metadata || {};
                
                console.log('🛒 Processing purchase:', metadata.type, metadata.itemId);
                
                switch (metadata.type) {
                    case 'coins':
                        this.processCoinsPurchase(payment, metadata);
                        break;
                    case 'theme':
                        this.processThemePurchase(payment, metadata);
                        break;
                    case 'effect':
                        this.processEffectPurchase(payment, metadata);
                        break;
                    case 'powerup':
                        this.processPowerupPurchase(payment, metadata);
                        break;
                    default:
                        console.warn('Unknown purchase type:', metadata.type);
                }
            } catch (error) {
                console.error('Error processing purchase:', error);
            }
        }

        // Process different purchase types
        processCoinsPurchase(payment, metadata) {
            const pack = window.STORE_ITEMS?.coinPacks?.[metadata.itemId];
            if (pack && typeof window.setUserInventory === 'function' && typeof window.setCoins === 'function') {
                const totalCoins = pack.coins + pack.bonus;
                
                window.setUserInventory(prev => ({
                    ...prev,
                    coins: prev.coins + totalCoins
                }));
                
                window.setCoins(prev => prev + totalCoins);
                
                console.log(`💰 Added ${totalCoins} coins to account`);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification(`💰 +${totalCoins.toLocaleString()} coins added!`, 'success');
                }
            }
        }

        processThemePurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    themes: [...prev.themes, metadata.itemId]
                }));
                
                console.log(`🎨 Unlocked theme: ${metadata.itemId}`);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification(`🎨 Theme unlocked!`, 'success');
                }
            }
        }

        processEffectPurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    effects: [...prev.effects, metadata.itemId]
                }));
                
                console.log(`✨ Unlocked effect: ${metadata.itemId}`);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification(`✨ Effect unlocked!`, 'success');
                }
            }
        }

        processPowerupPurchase(payment, metadata) {
            console.log(`⚡ Powerup activated: ${metadata.powerupType}`);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification(`⚡ Powerup activated!`, 'success');
            }
        }

        // Get service status
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                isAuthenticated: this.isAuthenticated,
                hasAuthData: !!this.authData,
                isPiBrowser: this.isPiBrowser,
                userUid: this.userUid,
                authType: 'Pi SDK Client-Side',
                piSdkAvailable: typeof Pi !== 'undefined'
            };
        }
    }

    // Replace the global instance
    window.piPaymentService = new PiPaymentService();

    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🚀 Starting Pi Payment Service...');
            await window.piPaymentService.init();
            console.log('✅ Pi Payment Service ready');
        } catch (error) {
            console.error('❌ Service failed to start:', error);
        }
    });

    // Global test function
    window.testRealPiPayment = async function(amount = 0.001) {
        try {
            console.log('🔥 Testing REAL Pi payment with amount:', amount);
            
            // Ensure authentication first
            if (!window.piPaymentService.isAuthenticated) {
                const authResult = await window.piPaymentService.authenticate();
                if (!authResult.success) {
                    throw new Error('Authentication failed');
                }
            }
            
            const payment = await window.piPaymentService.createPayment(
                amount,
                'ColorFlow Infinity - Test Real Payment',
                {
                    type: 'test',
                    itemId: 'real_test',
                    realTest: true
                }
            );

            console.log('🎉 REAL Pi payment created:', payment);
            return { success: true, payment: payment };
            
        } catch (error) {
            console.error('❌ Real Pi payment test failed:', error);
            return { success: false, error: error.message };
        }
    };

    console.log('💜 CORRECTED Pi Payment Service loaded');

})();