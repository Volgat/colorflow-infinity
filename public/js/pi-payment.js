// Pi Network Payment Service - Following Official Documentation Pattern
// Based on: https://github.com/pi-apps/docs

(function() {
    'use strict';
    
    // Pi Payment Configuration
    const PI_CONFIG = {
        version: "2.0",
        sandbox: false // Production mode for your domain
    };

    // Payment statuses
    const PAYMENT_STATUS = {
        PENDING: 'pending',
        APPROVED: 'approved',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        FAILED: 'failed'
    };

    // Storage keys
    const STORAGE_KEYS = {
        PENDING_PAYMENTS: 'colorflow_pending_pi_payments',
        COMPLETED_PAYMENTS: 'colorflow_completed_pi_payments',
        AUTH_DATA: 'colorflow_pi_auth_data'
    };

    class PiPaymentService {
        constructor() {
            this.isInitialized = false;
            this.isAuthenticated = false;
            this.authData = null;
            this.pendingPayments = this.loadPendingPayments();
            this.completedPayments = this.loadCompletedPayments();
        }

        // Initialize Pi SDK following official pattern
        async init() {
            try {
                if (typeof Pi === 'undefined') {
                    console.warn('⚠️ Pi SDK not available - development mode');
                    this.isInitialized = true;
                    return { success: true, message: 'Development mode' };
                }

                console.log('🚀 Initializing Pi SDK...');

                // Step 1: Initialize Pi SDK (Official Pattern)
                await Pi.init({ 
                    version: "2.0",
                    sandbox: PI_CONFIG.sandbox
                });

                this.isInitialized = true;
                console.log('✅ Pi SDK initialized successfully');

                return { success: true, message: 'Pi SDK initialized' };
            } catch (error) {
                console.error('❌ Pi SDK initialization failed:', error);
                return { success: false, error: error.message };
            }
        }

        // Authenticate user following official pattern
        async authenticate() {
            try {
                if (typeof Pi === 'undefined') {
                    console.log('🧪 Development mode - skipping auth');
                    this.isAuthenticated = true;
                    return { success: true, message: 'Development mode auth' };
                }

                if (!this.isInitialized) {
                    await this.init();
                }

                console.log('🔐 Authenticating user with payments scope...');

                // Step 2: Authenticate with payments scope (Official Pattern)
                const scopes = ['payments'];
                
                // Official onIncompletePaymentFound callback
                const onIncompletePaymentFound = (payment) => {
                    console.log('⚠️ Incomplete payment found:', payment);
                    this.handleIncompletePayment(payment);
                };

                // Official authentication call
                const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);
                
                this.isAuthenticated = true;
                this.authData = authResult;
                this.saveAuthData(authResult);

                console.log('✅ Authentication successful:', authResult);
                console.log('✅ Access token received:', authResult.accessToken ? 'Yes' : 'No');
                console.log('✅ User data:', authResult.user);

                return { success: true, authResult };
            } catch (error) {
                console.error('❌ Authentication failed:', error);
                this.isAuthenticated = false;
                this.authData = null;
                return { success: false, error: error.message };
            }
        }

        // Create payment following official pattern
        async createPayment(amount, memo, metadata = {}) {
            try {
                // Ensure authentication first
                if (!this.isAuthenticated) {
                    console.log('🔐 Not authenticated - authenticating now...');
                    const authResult = await this.authenticate();
                    if (!authResult.success) {
                        throw new Error('Authentication failed: ' + authResult.error);
                    }
                }

                // Generate payment ID
                const paymentId = this.generatePaymentId();
                
                // Development mode fallback
                if (typeof Pi === 'undefined') {
                    console.log('🧪 Development mode - simulating payment');
                    return this.simulatePayment(paymentId, amount, memo, metadata);
                }

                // Validate amount
                if (amount <= 0) {
                    throw new Error('Amount must be greater than 0');
                }

                console.log('💰 Creating Pi payment...');
                console.log('📋 Payment data:', { amount, memo, metadata });

                // Step 3: Create Payment (Official Pattern)
                const paymentData = {
                    amount: parseFloat(amount),
                    memo: memo || 'ColorFlow Infinity Purchase',
                    metadata: {
                        ...metadata,
                        gameId: 'colorflow_infinity',
                        timestamp: Date.now(),
                        paymentId: paymentId
                    }
                };

                // Official payment callbacks
                const paymentCallbacks = {
                    onReadyForServerApproval: (paymentId) => {
                        console.log('💰 Payment ready for server approval:', paymentId);
                        this.onReadyForServerApproval(paymentId);
                    },
                    onReadyForServerCompletion: (paymentId, txid) => {
                        console.log('✅ Payment ready for server completion:', paymentId, txid);
                        this.onReadyForServerCompletion(paymentId, txid);
                    },
                    onCancel: (paymentId) => {
                        console.log('❌ Payment cancelled:', paymentId);
                        this.onCancel(paymentId);
                    },
                    onError: (error, payment) => {
                        console.error('💥 Payment error:', error, payment);
                        this.onError(error, payment);
                    }
                };

                // Official createPayment call
                Pi.createPayment(paymentData, paymentCallbacks);

                // Store pending payment
                const pendingPayment = {
                    identifier: paymentId,
                    ...paymentData,
                    status: PAYMENT_STATUS.PENDING,
                    created_at: new Date().toISOString()
                };

                this.storePendingPayment(pendingPayment);

                console.log('✅ Pi payment created successfully');
                if (typeof window.addNotification === 'function') {
                    window.addNotification('✅ Pi payment created! Complete in Pi Browser.', 'success');
                }

                return pendingPayment;

            } catch (error) {
                console.error('❌ Payment creation failed:', error);
                
                // Fallback to simulation for development
                if (error.message.includes('scope') || error.message.includes('authentication')) {
                    console.log('🔄 Falling back to simulation due to auth issues');
                    const paymentId = this.generatePaymentId();
                    return this.simulatePayment(paymentId, amount, memo, metadata);
                }
                
                throw error;
            }
        }

        // Handle incomplete payment (Official Callback)
        handleIncompletePayment(payment) {
            console.log('🔄 Processing incomplete payment:', payment);
            
            // Store the incomplete payment for processing
            this.storeCompletedPayment(payment);
            
            // Process the purchase if it's valid
            if (payment.status && payment.status.developer_completed === false) {
                this.processPurchase(payment);
            }
        }

        // Server approval callback (Official Pattern)
        onReadyForServerApproval(paymentId) {
            try {
                console.log('🔄 Server approval required for:', paymentId);
                
                // In production, you would call your backend here
                // For this demo, we'll auto-approve
                const pendingPayments = this.loadPendingPayments();
                const payment = pendingPayments.find(p => p.identifier === paymentId);
                
                if (payment) {
                    payment.status = PAYMENT_STATUS.APPROVED;
                    payment.approved_at = new Date().toISOString();
                    this.updatePendingPayment(payment);
                    
                    console.log('✅ Payment approved:', paymentId);
                    if (typeof window.addNotification === 'function') {
                        window.addNotification('💰 Payment approved!', 'success');
                    }
                }
            } catch (error) {
                console.error('❌ Server approval error:', error);
            }
        }

        // Server completion callback (Official Pattern)
        onReadyForServerCompletion(paymentId, txid) {
            try {
                console.log('✅ Server completion required for:', paymentId, txid);
                
                const pendingPayments = this.loadPendingPayments();
                const payment = pendingPayments.find(p => p.identifier === paymentId);
                
                if (payment) {
                    payment.status = PAYMENT_STATUS.COMPLETED;
                    payment.completed_at = new Date().toISOString();
                    payment.txid = txid;
                    
                    // Move from pending to completed
                    this.removePendingPayment(paymentId);
                    this.storeCompletedPayment(payment);
                    
                    // Process the purchase
                    this.onPaymentCompleted(payment);
                    
                    console.log('🎉 Payment completed:', paymentId);
                }
            } catch (error) {
                console.error('❌ Server completion error:', error);
            }
        }

        // Payment cancellation callback (Official Pattern)
        onCancel(paymentId) {
            console.log('❌ Payment cancelled:', paymentId);
            
            const pendingPayments = this.loadPendingPayments();
            const payment = pendingPayments.find(p => p.identifier === paymentId);
            
            if (payment) {
                payment.status = PAYMENT_STATUS.CANCELLED;
                payment.cancelled_at = new Date().toISOString();
                this.updatePendingPayment(payment);
            }
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('❌ Payment cancelled', 'info');
            }
        }

        // Payment error callback (Official Pattern)
        onError(error, payment) {
            console.error('💥 Payment error:', error, payment);
            
            if (payment && payment.identifier) {
                const pendingPayments = this.loadPendingPayments();
                const existingPayment = pendingPayments.find(p => p.identifier === payment.identifier);
                
                if (existingPayment) {
                    existingPayment.status = PAYMENT_STATUS.FAILED;
                    existingPayment.error = error.message || error;
                    existingPayment.failed_at = new Date().toISOString();
                    this.updatePendingPayment(existingPayment);
                }
            }
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('💥 Payment error: ' + (error.message || error), 'error');
            }
        }

        // Simulate payment for development
        simulatePayment(paymentId, amount, memo, metadata) {
            console.log('🧪 Simulating Pi payment:', { paymentId, amount, memo, metadata });
            
            const simulatedPayment = {
                identifier: paymentId,
                amount: parseFloat(amount),
                memo: memo,
                metadata: metadata,
                status: PAYMENT_STATUS.PENDING,
                created_at: new Date().toISOString(),
                simulated: true
            };

            this.storePendingPayment(simulatedPayment);

            if (typeof window.addNotification === 'function') {
                window.addNotification('🧪 Simulating Pi payment... (3 seconds)', 'info');
            }

            // Complete simulation after 3 seconds
            setTimeout(() => {
                this.completeSimulatedPayment(paymentId);
            }, 3000);

            return simulatedPayment;
        }

        // Complete simulated payment
        completeSimulatedPayment(paymentId) {
            const pendingPayments = this.loadPendingPayments();
            const payment = pendingPayments.find(p => p.identifier === paymentId);
            
            if (payment) {
                payment.status = PAYMENT_STATUS.COMPLETED;
                payment.completed_at = new Date().toISOString();
                payment.txid = 'simulated_tx_' + Date.now();
                
                this.removePendingPayment(paymentId);
                this.storeCompletedPayment(payment);
                this.onPaymentCompleted(payment);
                
                console.log('✅ Simulated payment completed:', payment);
            }
        }

        // Payment completion handler
        onPaymentCompleted(payment) {
            console.log('🎉 Payment completed successfully:', payment);
            
            // Process the purchase
            this.processPurchase(payment);
            
            // Show notification
            const message = payment.simulated ? 
                '🧪 Simulated Pi payment completed!' : 
                '🎉 Pi payment completed successfully!';
            
            if (typeof window.addNotification === 'function') {
                window.addNotification(message, 'success');
            }
        }

        // Process purchase based on metadata
        processPurchase(payment) {
            try {
                const metadata = payment.metadata || {};
                
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
                    default:
                        console.warn('Unknown purchase type:', metadata.type);
                }
            } catch (error) {
                console.error('Error processing purchase:', error);
            }
        }

        // Process coins purchase
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
            }
        }

        // Process theme purchase
        processThemePurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    themes: [...prev.themes, metadata.itemId]
                }));
                
                console.log(`🎨 Unlocked theme: ${metadata.itemId}`);
            }
        }

        // Process effect purchase
        processEffectPurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    effects: [...prev.effects, metadata.itemId]
                }));
                
                console.log(`✨ Unlocked effect: ${metadata.itemId}`);
            }
        }

        // Storage utility methods
        loadPendingPayments() {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
                return stored ? JSON.parse(stored) : [];
            } catch (error) {
                return [];
            }
        }

        loadCompletedPayments() {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.COMPLETED_PAYMENTS);
                return stored ? JSON.parse(stored) : [];
            } catch (error) {
                return [];
            }
        }

        loadAuthData() {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.AUTH_DATA);
                return stored ? JSON.parse(stored) : null;
            } catch (error) {
                return null;
            }
        }

        saveAuthData(authData) {
            try {
                localStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));
            } catch (error) {
                console.error('Error saving auth data:', error);
            }
        }

        storePendingPayment(payment) {
            try {
                const pending = this.loadPendingPayments();
                pending.push(payment);
                localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(pending));
                this.pendingPayments = pending;
            } catch (error) {
                console.error('Error storing payment:', error);
            }
        }

        updatePendingPayment(updatedPayment) {
            try {
                const pending = this.loadPendingPayments();
                const index = pending.findIndex(p => p.identifier === updatedPayment.identifier);
                if (index !== -1) {
                    pending[index] = updatedPayment;
                    localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(pending));
                    this.pendingPayments = pending;
                }
            } catch (error) {
                console.error('Error updating payment:', error);
            }
        }

        removePendingPayment(paymentId) {
            try {
                const pending = this.loadPendingPayments();
                const filtered = pending.filter(p => p.identifier !== paymentId);
                localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(filtered));
                this.pendingPayments = filtered;
            } catch (error) {
                console.error('Error removing payment:', error);
            }
        }

        storeCompletedPayment(payment) {
            try {
                const completed = this.loadCompletedPayments();
                completed.push(payment);
                localStorage.setItem(STORAGE_KEYS.COMPLETED_PAYMENTS, JSON.stringify(completed));
                this.completedPayments = completed;
            } catch (error) {
                console.error('Error storing completed payment:', error);
            }
        }

        // Generate unique payment ID
        generatePaymentId() {
            return 'colorflow_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        }

        // Get service status
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                isAuthenticated: this.isAuthenticated,
                hasAuthData: !!this.authData,
                piSdkAvailable: typeof Pi !== 'undefined',
                pendingPayments: this.pendingPayments.length,
                completedPayments: this.completedPayments.length
            };
        }

        // Get payment history
        getPaymentHistory() {
            return {
                pending: this.loadPendingPayments(),
                completed: this.loadCompletedPayments()
            };
        }
    }

    // Create global instance
    window.piPaymentService = new PiPaymentService();

    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🚀 Starting Pi Payment Service (Official Pattern)...');
            await window.piPaymentService.init();
            console.log('✅ Pi Payment Service ready');
        } catch (error) {
            console.error('❌ Pi Payment Service failed to start:', error);
        }
    });

    // Global status function
    window.piStatus = function() {
        const status = window.piPaymentService.getStatus();
        console.table(status);
        return status;
    };

    // Global authentication function
    window.piAuth = async function() {
        try {
            const result = await window.piPaymentService.authenticate();
            console.log('Authentication result:', result);
            return result;
        } catch (error) {
            console.error('Authentication failed:', error);
            return { success: false, error: error.message };
        }
    };

    console.log('💜 Pi Payment Service loaded (Official Pattern)');

})();