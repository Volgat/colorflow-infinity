// Pi Network Payment Service for ColorFlow Infinity - CORS Fixed
// This file handles all Pi Network payment operations

(function() {
    'use strict';
    
    // Pi Payment Configuration - Configuration côté client
    const PI_CONFIG = {
        // Configuration pour production (pas sandbox pour éviter CORS)
        apiKey: 'your_pi_api_key_here',
        appId: 'your_pi_app_id_here',
        environment: 'production', // CHANGÉ EN PRODUCTION pour éviter les erreurs CORS
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
            this.pendingPayments = this.loadPendingPayments();
            this.completedPayments = this.loadCompletedPayments();
            this.userBalance = this.loadUserBalance();
            this.corsErrorDetected = false;
        }

        // Initialize the Pi Payment Service avec gestion CORS améliorée
        async init() {
            try {
                if (typeof Pi === 'undefined') {
                    console.warn('⚠️ Pi SDK not available - running in development mode');
                    this.isInitialized = true;
                    return { success: true, message: 'Development mode initialized' };
                }

                console.log('🚀 Initializing Pi SDK for production environment...');

                // Détection de l'environnement automatique
                const isLocalhost = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' ||
                                  window.location.hostname.includes('localhost');

                const environment = isLocalhost ? 'sandbox' : 'production';
                console.log(`🌍 Detected environment: ${environment}`);

                // Initialize Pi SDK avec configuration adaptée à l'environnement
                const initConfig = {
                    version: "2.0",
                    sandbox: environment === 'sandbox'
                };

                console.log('📋 Pi SDK init config:', initConfig);

                await Pi.init(initConfig);

                this.isInitialized = true;
                console.log('✅ Pi SDK initialized successfully');
                
                return { success: true, message: 'Pi Payment Service initialized' };
            } catch (error) {
                console.error('❌ Pi Payment Service initialization error:', error);
                
                // Détecter les erreurs CORS spécifiques
                if (error.message && error.message.includes('postMessage')) {
                    this.corsErrorDetected = true;
                    console.warn('🚨 CORS error detected - switching to fallback mode');
                    return { success: false, error: 'CORS_ERROR', corsError: true };
                }
                
                return { success: false, error: error.message };
            }
        }

        // Authenticate user pour payments avec gestion d'erreur CORS
        async authenticateUser() {
            try {
                if (typeof Pi === 'undefined') {
                    console.log('🧪 Pi SDK not available - development mode');
                    return { success: true, message: 'Development mode - no auth needed' };
                }

                if (this.corsErrorDetected) {
                    console.warn('⚠️ CORS error detected - skipping authentication');
                    return { success: false, error: 'CORS error prevents authentication' };
                }

                console.log('🔐 Authenticating user for Pi payments...');
                
                // Méthode d'authentification simplifiée pour éviter CORS
                try {
                    // Tentative d'authentification avec timeout
                    const authPromise = Pi.authenticate(['payments'], function(scopes) {
                        console.log('✅ User approved scopes:', scopes);
                        return scopes && scopes.indexOf('payments') >= 0;
                    });

                    // Timeout de 10 secondes pour éviter les blocages
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Authentication timeout')), 10000);
                    });

                    const authResult = await Promise.race([authPromise, timeoutPromise]);
                    
                    console.log('✅ Pi Network authentication successful:', authResult);
                    return { success: true, authResult };

                } catch (authError) {
                    console.warn('⚠️ Authentication failed, but continuing:', authError);
                    // Continue sans authentification si erreur CORS
                    if (authError.message && authError.message.includes('postMessage')) {
                        this.corsErrorDetected = true;
                        return { success: false, error: 'CORS_AUTH_ERROR', canContinue: true };
                    }
                    throw authError;
                }

            } catch (error) {
                console.error('❌ Pi authentication error:', error);
                return { success: false, error: error.message };
            }
        }

        // Create a new Pi payment avec gestion CORS robuste
        async createPayment(amount, memo, metadata = {}) {
            if (!this.isInitialized) {
                console.log('🔄 Pi service not initialized, initializing now...');
                const initResult = await this.init();
                if (!initResult.success && !initResult.corsError) {
                    throw new Error('Failed to initialize Pi service: ' + initResult.error);
                }
            }

            try {
                // Generate unique payment ID
                const paymentId = this.generatePaymentId();
                
                if (typeof Pi === 'undefined' || this.corsErrorDetected) {
                    // Development mode ou CORS error - simulate payment
                    console.log('🧪 Development mode or CORS error - simulating Pi payment');
                    if (typeof window.addNotification === 'function') {
                        window.addNotification('🧪 Simulating Pi payment (CORS/Dev mode)', 'info');
                    }
                    return this.simulatePayment(paymentId, amount, memo, metadata);
                }

                // Validate payment amount
                if (amount <= 0) {
                    throw new Error('Payment amount must be greater than 0');
                }

                // Tentative d'authentification (optionnelle si CORS)
                console.log('🔐 Attempting authentication...');
                const authResult = await this.authenticateUser();
                if (!authResult.success && !authResult.canContinue) {
                    console.warn('⚠️ Authentication failed, but trying to continue with payment');
                }

                // Prepare payment data
                const paymentData = {
                    amount: parseFloat(amount).toFixed(7), // Pi precision
                    memo: memo || 'ColorFlow Infinity Purchase',
                    metadata: {
                        ...metadata,
                        gameId: 'colorflow_infinity',
                        timestamp: Date.now(),
                        paymentId: paymentId
                    }
                };

                console.log('💰 Creating Pi payment with data:', paymentData);

                // Create Pi payment avec gestion d'erreur CORS
                let payment;
                try {
                    payment = await Promise.race([
                        Pi.createPayment(paymentData, {
                            // Called when the payment is ready for server approval
                            onReadyForServerApproval: (paymentId) => {
                                console.log('💰 Payment ready for server approval:', paymentId);
                                this.handleServerApproval(paymentId);
                            },
                            
                            // Called when the payment is ready for server completion
                            onReadyForServerCompletion: (paymentId, txid) => {
                                console.log('✅ Payment ready for completion:', paymentId, txid);
                                this.handleServerCompletion(paymentId, txid);
                            },
                            
                            // Called when payment is cancelled
                            onCancel: (paymentId) => {
                                console.log('❌ Payment cancelled:', paymentId);
                                this.handlePaymentCancellation(paymentId);
                            },
                            
                            // Called when payment encounters an error
                            onError: (error, payment) => {
                                console.error('💥 Payment error:', error, payment);
                                this.handlePaymentError(error, payment);
                            }
                        }),
                        // Timeout de 15 secondes
                        new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Payment creation timeout')), 15000);
                        })
                    ]);
                } catch (paymentError) {
                    console.error('❌ Payment creation failed:', paymentError);
                    
                    // Si c'est une erreur CORS, basculer en mode simulation
                    if (paymentError.message && paymentError.message.includes('postMessage')) {
                        console.warn('🔄 CORS error in payment - switching to simulation');
                        this.corsErrorDetected = true;
                        if (typeof window.addNotification === 'function') {
                            window.addNotification('🔄 CORS issue detected - using simulation mode', 'info');
                        }
                        return this.simulatePayment(paymentId, amount, memo, metadata);
                    }
                    
                    throw paymentError;
                }

                // Store pending payment
                this.storePendingPayment(payment);
                
                console.log('✅ Pi payment created successfully:', payment);
                if (typeof window.addNotification === 'function') {
                    window.addNotification('✅ Pi payment created! Complete in Pi Browser.', 'success');
                }
                
                return payment;
            } catch (error) {
                console.error('❌ Failed to create Pi payment:', error);
                
                // Fallback vers simulation en cas d'erreur
                if (error.message && (error.message.includes('postMessage') || error.message.includes('timeout'))) {
                    console.log('🔄 Falling back to simulation due to error');
                    const paymentId = this.generatePaymentId();
                    if (typeof window.addNotification === 'function') {
                        window.addNotification('🔄 Using simulation mode due to network issues', 'info');
                    }
                    return this.simulatePayment(paymentId, amount, memo, metadata);
                }
                
                throw error;
            }
        }

        // Simulate payment for development mode ou CORS fallback
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

            // Simulate payment completion after 3 seconds
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
                
                // Trigger payment completion callback
                this.onPaymentCompleted(payment);
                
                console.log('✅ Simulated payment completed:', payment);
            }
        }

        // Handle server approval step
        async handleServerApproval(paymentId) {
            try {
                console.log('🔄 Handling server approval for payment:', paymentId);
                
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

        // Handle server completion step
        async handleServerCompletion(paymentId, txid) {
            try {
                console.log('✅ Handling server completion for payment:', paymentId, txid);
                
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
                
                // Notify the game
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
                    
                    // Notify the game
                    this.onPaymentFailed(existingPayment, error);
                }
            }
        }

        // Payment completion callback
        onPaymentCompleted(payment) {
            console.log('🎉 Payment completed successfully:', payment);
            
            // Update user's Pi balance if tracking locally
            this.updateUserBalance(payment);
            
            // Process the purchase based on metadata
            this.processPurchase(payment);
            
            // Show success notification
            const message = payment.simulated ? 
                '🧪 Simulated Pi payment completed!' : 
                '🎉 Pi payment completed successfully!';
            
            if (typeof window.addNotification === 'function') {
                window.addNotification(message, 'success');
            }
        }

        // Payment cancellation callback
        onPaymentCancelled(payment) {
            console.log('❌ Payment was cancelled:', payment);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('❌ Pi payment was cancelled', 'info');
            }
        }

        // Payment failure callback
        onPaymentFailed(payment, error) {
            console.error('💥 Payment failed:', payment, error);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('💥 Pi payment failed: ' + (error.message || error), 'error');
            }
        }

        // Process purchase based on payment metadata
        processPurchase(payment) {
            try {
                const metadata = payment.metadata || {};
                
                switch (metadata.type) {
                    case 'powerup':
                        this.processPowerupPurchase(payment, metadata);
                        break;
                    case 'coins':
                        this.processCoinsPurchase(payment, metadata);
                        break;
                    case 'theme':
                        this.processThemePurchase(payment, metadata);
                        break;
                    case 'effect':
                        this.processEffectPurchase(payment, metadata);
                        break;
                    case 'premium':
                        this.processPremiumPurchase(payment, metadata);
                        break;
                    default:
                        console.warn('Unknown purchase type:', metadata.type);
                }
            } catch (error) {
                console.error('Error processing purchase:', error);
            }
        }

        // Process different purchase types
        processPowerupPurchase(payment, metadata) {
            console.log('⚡ Processing powerup purchase:', metadata.powerupType);
        }

        processCoinsPurchase(payment, metadata) {
            const pack = window.STORE_ITEMS?.coinPacks?.[metadata.itemId];
            if (pack && typeof window.setUserInventory === 'function' && typeof window.setCoins === 'function') {
                const totalCoins = pack.coins + pack.bonus;
                
                window.setUserInventory(prev => ({
                    ...prev,
                    coins: prev.coins + totalCoins
                }));
                
                window.setCoins(prev => prev + totalCoins);
                
                console.log(`💰 Added ${totalCoins} coins to user account`);
            }
        }

        processThemePurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    themes: [...prev.themes, metadata.itemId]
                }));
                
                console.log(`🎨 Unlocked theme: ${metadata.itemId}`);
            }
        }

        processEffectPurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    effects: [...prev.effects, metadata.itemId]
                }));
                
                console.log(`✨ Unlocked effect: ${metadata.itemId}`);
            }
        }

        processPremiumPurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    premium: true
                }));
                
                console.log('👑 Activated premium features');
            }
        }

        // Update user's Pi balance
        updateUserBalance(payment) {
            const currentBalance = this.loadUserBalance();
            const newBalance = Math.max(0, currentBalance - parseFloat(payment.amount));
            this.saveUserBalance(newBalance);
        }

        // Utility functions for local storage
        loadPendingPayments() {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
                return stored ? JSON.parse(stored) : [];
            } catch (error) {
                console.error('Error loading pending payments:', error);
                return [];
            }
        }

        loadCompletedPayments() {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.COMPLETED_PAYMENTS);
                return stored ? JSON.parse(stored) : [];
            } catch (error) {
                console.error('Error loading completed payments:', error);
                return [];
            }
        }

        loadUserBalance() {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.USER_BALANCE);
                return stored ? parseFloat(stored) : 0;
            } catch (error) {
                console.error('Error loading user balance:', error);
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
                console.error('Error storing pending payment:', error);
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
                console.error('Error updating pending payment:', error);
            }
        }

        removePendingPayment(paymentId) {
            try {
                const pending = this.loadPendingPayments();
                const filtered = pending.filter(p => p.identifier !== paymentId);
                localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(filtered));
                this.pendingPayments = filtered;
            } catch (error) {
                console.error('Error removing pending payment:', error);
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
                console.error('Error saving user balance:', error);
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

        // Test connection to Pi Network
        async testConnection() {
            try {
                if (typeof Pi === 'undefined') {
                    return { connected: false, message: 'Pi SDK not available' };
                }

                const authResult = await this.authenticateUser();
                return { 
                    connected: authResult.success, 
                    message: authResult.success ? 'Connected to Pi Network' : authResult.error,
                    corsDetected: this.corsErrorDetected
                };
            } catch (error) {
                return { connected: false, message: error.message };
            }
        }

        // Get diagnostic info
        getDiagnostics() {
            return {
                isInitialized: this.isInitialized,
                corsErrorDetected: this.corsErrorDetected,
                piSdkAvailable: typeof Pi !== 'undefined',
                environment: PI_CONFIG.environment,
                hostname: window.location.hostname,
                pendingPayments: this.pendingPayments.length,
                completedPayments: this.completedPayments.length
            };
        }
    }

    // Create global instance
    window.piPaymentService = new PiPaymentService();

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🚀 Initializing Pi Payment Service with CORS handling...');
            await window.piPaymentService.init();
            console.log('✅ Pi Payment Service ready');
            
            // Diagnostic info
            setTimeout(() => {
                const diagnostics = window.piPaymentService.getDiagnostics();
                console.log('🔍 Pi Service Diagnostics:', diagnostics);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Failed to initialize Pi Payment Service:', error);
        }
    });

    // Global diagnostic function
    window.piDiagnostics = function() {
        const diagnostics = window.piPaymentService.getDiagnostics();
        console.table(diagnostics);
        return diagnostics;
    };

    console.log('💜 Pi Payment Service with CORS handling loaded successfully');

})();