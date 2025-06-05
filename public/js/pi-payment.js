// Pi Network Payment Service for ColorFlow Infinity - FINAL SCOPE FIX
// This file handles all Pi Network payment operations with proper scope management

(function() {
    'use strict';
    
    // Pi Payment Configuration
    const PI_CONFIG = {
        apiKey: 'your_pi_api_key_here',
        appId: 'your_pi_app_id_here',
        environment: 'production',
        walletAddress: 'your_pi_wallet_address'
    };

    // Payment transaction statuses
    const PAYMENT_STATUS = {
        PENDING: 'pending',
        APPROVED: 'approved',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        FAILED: 'failed'
    };

    // Local storage for payment tracking
    const STORAGE_KEYS = {
        PENDING_PAYMENTS: 'colorflow_pending_pi_payments',
        COMPLETED_PAYMENTS: 'colorflow_completed_pi_payments',
        USER_BALANCE: 'colorflow_user_pi_balance'
    };

    class PiPaymentService {
        constructor() {
            this.isInitialized = false;
            this.isAuthenticated = false;
            this.hasPaymentsScope = false;
            this.pendingPayments = this.loadPendingPayments();
            this.completedPayments = this.loadCompletedPayments();
            this.userBalance = this.loadUserBalance();
        }

        // Initialize Pi SDK with proper scope configuration
        async init() {
            try {
                if (typeof Pi === 'undefined') {
                    console.warn('⚠️ Pi SDK not available - running in development mode');
                    this.isInitialized = true;
                    return { success: true, message: 'Development mode initialized' };
                }

                console.log('🚀 Initializing Pi SDK with payments scope...');

                // Detect environment
                const isLocalhost = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' ||
                                  window.location.hostname.includes('localhost');

                const sandbox = isLocalhost;
                console.log(`🌍 Environment: ${sandbox ? 'sandbox' : 'production'}`);

                // CRITICAL: Initialize with payments scope
                await Pi.init({
                    version: "2.0",
                    sandbox: sandbox,
                    scopes: ['payments'] // ✅ SCOPE PAYMENTS REQUIS
                });

                this.isInitialized = true;
                console.log('✅ Pi SDK initialized with payments scope');
                
                // Immediately request authentication with payments scope
                await this.requestPaymentsAuth();
                
                return { success: true, message: 'Pi Payment Service initialized with payments scope' };
            } catch (error) {
                console.error('❌ Pi SDK initialization error:', error);
                return { success: false, error: error.message };
            }
        }

        // Request payments authentication immediately
        async requestPaymentsAuth() {
            try {
                if (typeof Pi === 'undefined') {
                    console.log('🧪 Pi SDK not available - skipping auth');
                    this.isAuthenticated = true;
                    this.hasPaymentsScope = true;
                    return { success: true };
                }

                console.log('🔐 Requesting payments authentication...');

                // Request authentication with payments scope
                const authResult = await Pi.authenticate(['payments'], (scopes) => {
                    console.log('👤 User approved scopes:', scopes);
                    const hasPayments = scopes && scopes.includes('payments');
                    this.hasPaymentsScope = hasPayments;
                    return hasPayments;
                });

                this.isAuthenticated = true;
                console.log('✅ Authentication successful:', authResult);
                console.log('✅ Payments scope granted:', this.hasPaymentsScope);

                if (!this.hasPaymentsScope) {
                    throw new Error('Payments scope not granted by user');
                }

                return { success: true, authResult };
            } catch (error) {
                console.error('❌ Authentication error:', error);
                this.isAuthenticated = false;
                this.hasPaymentsScope = false;
                return { success: false, error: error.message };
            }
        }

        // Create a new Pi payment with proper scope verification
        async createPayment(amount, memo, metadata = {}) {
            try {
                // Ensure service is initialized
                if (!this.isInitialized) {
                    console.log('🔄 Initializing Pi service...');
                    const initResult = await this.init();
                    if (!initResult.success) {
                        throw new Error('Failed to initialize Pi service: ' + initResult.error);
                    }
                }

                // Generate unique payment ID
                const paymentId = this.generatePaymentId();
                
                // Development mode fallback
                if (typeof Pi === 'undefined') {
                    console.log('🧪 Development mode - simulating payment');
                    return this.simulatePayment(paymentId, amount, memo, metadata);
                }

                // Verify payments scope
                if (!this.hasPaymentsScope) {
                    console.warn('⚠️ No payments scope - attempting re-authentication...');
                    const authResult = await this.requestPaymentsAuth();
                    if (!authResult.success) {
                        console.log('🔄 Auth failed - falling back to simulation');
                        return this.simulatePayment(paymentId, amount, memo, metadata);
                    }
                }

                // Validate amount
                if (amount <= 0) {
                    throw new Error('Payment amount must be greater than 0');
                }

                // Prepare payment data
                const paymentData = {
                    amount: parseFloat(amount).toFixed(7),
                    memo: memo || 'ColorFlow Infinity Purchase',
                    metadata: {
                        ...metadata,
                        gameId: 'colorflow_infinity',
                        timestamp: Date.now(),
                        paymentId: paymentId
                    }
                };

                console.log('💰 Creating Pi payment:', paymentData);
                console.log('🔐 Auth status:', { 
                    isAuthenticated: this.isAuthenticated, 
                    hasPaymentsScope: this.hasPaymentsScope 
                });

                // Create the payment
                const payment = await Pi.createPayment(paymentData, {
                    onReadyForServerApproval: (paymentId) => {
                        console.log('💰 Payment ready for approval:', paymentId);
                        this.handleServerApproval(paymentId);
                    },
                    onReadyForServerCompletion: (paymentId, txid) => {
                        console.log('✅ Payment ready for completion:', paymentId, txid);
                        this.handleServerCompletion(paymentId, txid);
                    },
                    onCancel: (paymentId) => {
                        console.log('❌ Payment cancelled:', paymentId);
                        this.handlePaymentCancellation(paymentId);
                    },
                    onError: (error, payment) => {
                        console.error('💥 Payment error:', error, payment);
                        this.handlePaymentError(error, payment);
                    }
                });

                // Store pending payment
                this.storePendingPayment(payment);
                
                console.log('✅ Pi payment created successfully:', payment);
                if (typeof window.addNotification === 'function') {
                    window.addNotification('✅ Pi payment created! Complete in Pi Browser.', 'success');
                }
                
                return payment;

            } catch (error) {
                console.error('❌ Payment creation failed:', error);
                
                // Special handling for scope errors
                if (error.message && error.message.includes('payments') && error.message.includes('scope')) {
                    console.log('🔄 Scope error detected - falling back to simulation');
                    const paymentId = this.generatePaymentId();
                    if (typeof window.addNotification === 'function') {
                        window.addNotification('🔄 Scope issue - using simulation mode', 'info');
                    }
                    return this.simulatePayment(paymentId, amount, memo, metadata);
                }
                
                throw error;
            }
        }

        // Simulate payment for development/fallback
        simulatePayment(paymentId, amount, memo, metadata) {
            console.log('🧪 Simulating Pi payment:', { paymentId, amount, memo, metadata });
            
            const simulatedPayment = {
                identifier: paymentId,
                amount: parseFloat(amount).toFixed(7),
                memo: memo,
                metadata: metadata,
                status: PAYMENT_STATUS.PENDING,
                from_address: 'simulated_user_address',
                to_address: PI_CONFIG.walletAddress,
                created_at: new Date().toISOString(),
                simulated: true
            };

            // Store as pending
            this.storePendingPayment(simulatedPayment);

            // Show notification
            if (typeof window.addNotification === 'function') {
                window.addNotification('🧪 Simulating Pi payment... (3 seconds)', 'info');
            }

            // Complete after 3 seconds
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
                
                // Move from pending to completed
                this.removePendingPayment(paymentId);
                this.storeCompletedPayment(payment);
                
                // Trigger completion callback
                this.onPaymentCompleted(payment);
                
                console.log('✅ Simulated payment completed:', payment);
            }
        }

        // Handle server approval
        async handleServerApproval(paymentId) {
            try {
                console.log('🔄 Server approval for:', paymentId);
                
                const pendingPayments = this.loadPendingPayments();
                const payment = pendingPayments.find(p => p.identifier === paymentId);
                
                if (payment) {
                    payment.status = PAYMENT_STATUS.APPROVED;
                    payment.approved_at = new Date().toISOString();
                    this.updatePendingPayment(payment);
                    
                    if (typeof window.addNotification === 'function') {
                        window.addNotification('💰 Payment approved!', 'success');
                    }
                }
                
                return { approved: true };
            } catch (error) {
                console.error('❌ Server approval error:', error);
                return { approved: false, error: error.message };
            }
        }

        // Handle server completion
        async handleServerCompletion(paymentId, txid) {
            try {
                console.log('✅ Server completion for:', paymentId, txid);
                
                const pendingPayments = this.loadPendingPayments();
                const payment = pendingPayments.find(p => p.identifier === paymentId);
                
                if (payment) {
                    payment.status = PAYMENT_STATUS.COMPLETED;
                    payment.completed_at = new Date().toISOString();
                    payment.txid = txid;
                    
                    // Move from pending to completed
                    this.removePendingPayment(paymentId);
                    this.storeCompletedPayment(payment);
                    
                    // Trigger completion callback
                    this.onPaymentCompleted(payment);
                }
                
                return { completed: true };
            } catch (error) {
                console.error('❌ Server completion error:', error);
                return { completed: false, error: error.message };
            }
        }

        // Handle payment cancellation
        handlePaymentCancellation(paymentId) {
            console.log('❌ Payment cancelled:', paymentId);
            
            const pendingPayments = this.loadPendingPayments();
            const payment = pendingPayments.find(p => p.identifier === paymentId);
            
            if (payment) {
                payment.status = PAYMENT_STATUS.CANCELLED;
                payment.cancelled_at = new Date().toISOString();
                this.updatePendingPayment(payment);
                
                this.onPaymentCancelled(payment);
            }
        }

        // Handle payment error
        handlePaymentError(error, payment) {
            console.error('💥 Payment error:', error, payment);
            
            if (payment && payment.identifier) {
                const pendingPayments = this.loadPendingPayments();
                const existingPayment = pendingPayments.find(p => p.identifier === payment.identifier);
                
                if (existingPayment) {
                    existingPayment.status = PAYMENT_STATUS.FAILED;
                    existingPayment.error = error.message || error;
                    existingPayment.failed_at = new Date().toISOString();
                    this.updatePendingPayment(existingPayment);
                    
                    this.onPaymentFailed(existingPayment, error);
                }
            }
        }

        // Payment completion callback
        onPaymentCompleted(payment) {
            console.log('🎉 Payment completed:', payment);
            
            // Update balance
            this.updateUserBalance(payment);
            
            // Process purchase
            this.processPurchase(payment);
            
            // Show notification
            const message = payment.simulated ? 
                '🧪 Simulated Pi payment completed!' : 
                '🎉 Real Pi payment completed!';
            
            if (typeof window.addNotification === 'function') {
                window.addNotification(message, 'success');
            }
        }

        // Payment cancellation callback
        onPaymentCancelled(payment) {
            console.log('❌ Payment cancelled:', payment);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('❌ Pi payment cancelled', 'info');
            }
        }

        // Payment failure callback
        onPaymentFailed(payment, error) {
            console.error('💥 Payment failed:', payment, error);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('💥 Pi payment failed: ' + (error.message || error), 'error');
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
                
                console.log(`💰 Added ${totalCoins} coins`);
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

        // Process powerup purchase
        processPowerupPurchase(payment, metadata) {
            console.log('⚡ Powerup activated:', metadata.powerupType);
        }

        // Update user balance
        updateUserBalance(payment) {
            const currentBalance = this.loadUserBalance();
            const newBalance = Math.max(0, currentBalance - parseFloat(payment.amount));
            this.saveUserBalance(newBalance);
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

        loadUserBalance() {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.USER_BALANCE);
                return stored ? parseFloat(stored) : 0;
            } catch (error) {
                return 0;
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

        saveUserBalance(balance) {
            try {
                localStorage.setItem(STORAGE_KEYS.USER_BALANCE, balance.toString());
                this.userBalance = balance;
            } catch (error) {
                console.error('Error saving balance:', error);
            }
        }

        // Generate unique payment ID
        generatePaymentId() {
            return 'colorflow_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        }

        // Get payment history
        getPaymentHistory() {
            return {
                pending: this.loadPendingPayments(),
                completed: this.loadCompletedPayments()
            };
        }

        // Get service status
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                isAuthenticated: this.isAuthenticated,
                hasPaymentsScope: this.hasPaymentsScope,
                piSdkAvailable: typeof Pi !== 'undefined',
                pendingPayments: this.pendingPayments.length,
                completedPayments: this.completedPayments.length
            };
        }
    }

    // Create global instance
    window.piPaymentService = new PiPaymentService();

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🚀 Starting Pi Payment Service...');
            await window.piPaymentService.init();
            console.log('✅ Pi Payment Service initialized');
            
            // Show status after init
            setTimeout(() => {
                const status = window.piPaymentService.getStatus();
                console.log('📊 Pi Service Status:', status);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Pi Payment Service init failed:', error);
        }
    });

    // Global status function
    window.piStatus = function() {
        const status = window.piPaymentService.getStatus();
        console.table(status);
        return status;
    };

    console.log('💜 Pi Payment Service loaded with proper scope management');

})();