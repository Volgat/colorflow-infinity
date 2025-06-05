// Pi Network Payment Service for ColorFlow Infinity
// This file handles all Pi Network payment operations

(function() {
    'use strict';
    
    // Pi Payment Configuration - Configuration côté client
    const PI_CONFIG = {
        // Ces valeurs seront configurées via les variables d'environnement Vercel
        // ou via des constantes par défaut pour le développement
        apiKey: 'your_pi_api_key_here', // Sera remplacé par la vraie clé via backend
        appId: 'your_pi_app_id_here',
        environment: 'sandbox', // Par défaut en sandbox pour le développement
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
        }

        // Initialize the Pi Payment Service
        async init() {
            try {
                if (typeof Pi === 'undefined') {
                    console.warn('Pi SDK not available - running in development mode');
                    this.isInitialized = true;
                    return { success: true, message: 'Development mode initialized' };
                }

                // Initialize Pi SDK with payment capabilities
                await Pi.init({
                    version: "2.0",
                    sandbox: PI_CONFIG.environment === 'sandbox'
                });

                this.isInitialized = true;
                console.log('Pi Payment Service initialized successfully');
                
                // Check for any pending payments
                await this.checkPendingPayments();
                
                return { success: true, message: 'Pi Payment Service initialized' };
            } catch (error) {
                console.error('Pi Payment Service initialization error:', error);
                return { success: false, error: error.message };
            }
        }

        // Create a new Pi payment
        async createPayment(amount, memo, metadata = {}) {
            if (!this.isInitialized) {
                throw new Error('Pi Payment Service not initialized');
            }

            try {
                // Generate unique payment ID
                const paymentId = this.generatePaymentId();
                
                if (typeof Pi === 'undefined') {
                    // Development mode - simulate payment
                    return this.simulatePayment(paymentId, amount, memo, metadata);
                }

                // Validate payment amount
                if (amount <= 0) {
                    throw new Error('Payment amount must be greater than 0');
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

                console.log('Creating Pi payment:', paymentData);

                // Create Pi payment
                const payment = await Pi.createPayment(paymentData, {
                    // Called when the payment is ready for server approval
                    onReadyForServerApproval: (paymentId) => {
                        console.log('Payment ready for server approval:', paymentId);
                        this.handleServerApproval(paymentId);
                    },
                    
                    // Called when the payment is ready for server completion
                    onReadyForServerCompletion: (paymentId, txid) => {
                        console.log('Payment ready for completion:', paymentId, txid);
                        this.handleServerCompletion(paymentId, txid);
                    },
                    
                    // Called when payment is cancelled
                    onCancel: (paymentId) => {
                        console.log('Payment cancelled:', paymentId);
                        this.handlePaymentCancellation(paymentId);
                    },
                    
                    // Called when payment encounters an error
                    onError: (error, payment) => {
                        console.error('Payment error:', error, payment);
                        this.handlePaymentError(error, payment);
                    }
                });

                // Store pending payment
                this.storePendingPayment(payment);
                
                return payment;
            } catch (error) {
                console.error('Failed to create Pi payment:', error);
                throw error;
            }
        }

        // Simulate payment for development mode
        simulatePayment(paymentId, amount, memo, metadata) {
            console.log('Simulating Pi payment:', { paymentId, amount, memo, metadata });
            
            const simulatedPayment = {
                identifier: paymentId,
                amount: parseFloat(amount).toFixed(7),
                memo: memo,
                metadata: metadata,
                status: PAYMENT_STATUS.PENDING,
                from_address: 'simulated_user_address',
                to_address: PI_CONFIG.walletAddress,
                created_at: new Date().toISOString()
            };

            // Store as pending
            this.storePendingPayment(simulatedPayment);

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
                
                console.log('Simulated payment completed:', payment);
            }
        }

        // Handle server approval step
        async handleServerApproval(paymentId) {
            try {
                // In a real app, you would make an API call to your backend
                // to approve the payment on the server side
                console.log('Handling server approval for payment:', paymentId);
                
                // For this demo, we'll auto-approve
                // In production, implement proper server-side verification
                
                const pendingPayments = this.loadPendingPayments();
                const payment = pendingPayments.find(p => p.identifier === paymentId);
                
                if (payment) {
                    payment.status = PAYMENT_STATUS.APPROVED;
                    payment.approved_at = new Date().toISOString();
                    this.updatePendingPayment(payment);
                }
                
                return { approved: true };
            } catch (error) {
                console.error('Server approval error:', error);
                return { approved: false, error: error.message };
            }
        }

        // Handle server completion step
        async handleServerCompletion(paymentId, txid) {
            try {
                console.log('Handling server completion for payment:', paymentId, txid);
                
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
                console.error('Server completion error:', error);
                return { completed: false, error: error.message };
            }
        }

        // Handle payment cancellation
        handlePaymentCancellation(paymentId) {
            console.log('Payment cancelled:', paymentId);
            
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
            console.error('Payment error:', error, payment);
            
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

        // Check and process any pending payments
        async checkPendingPayments() {
            const pendingPayments = this.loadPendingPayments();
            
            for (const payment of pendingPayments) {
                try {
                    if (typeof Pi !== 'undefined') {
                        // Check payment status with Pi Network
                        // In a real implementation, you would query the Pi API
                        console.log('Checking status for payment:', payment.identifier);
                    }
                } catch (error) {
                    console.error('Error checking payment status:', error);
                }
            }
        }

        // Payment completion callback
        onPaymentCompleted(payment) {
            console.log('Payment completed successfully:', payment);
            
            // Update user's Pi balance if tracking locally
            this.updateUserBalance(payment);
            
            // Process the purchase based on metadata
            this.processPurchase(payment);
            
            // Show success notification
            if (typeof window.addNotification === 'function') {
                window.addNotification('Payment completed successfully!', 'success');
            }
        }

        // Payment cancellation callback
        onPaymentCancelled(payment) {
            console.log('Payment was cancelled:', payment);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('Payment was cancelled', 'info');
            }
        }

        // Payment failure callback
        onPaymentFailed(payment, error) {
            console.error('Payment failed:', payment, error);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification('Payment failed: ' + (error.message || error), 'error');
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

        // Process powerup purchase
        processPowerupPurchase(payment, metadata) {
            console.log('Processing powerup purchase:', metadata.powerupType);
            // The powerup activation is handled in the main game logic
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
                
                console.log(`Added ${totalCoins} coins to user account`);
            }
        }

        // Process theme purchase
        processThemePurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    themes: [...prev.themes, metadata.itemId]
                }));
                
                console.log(`Unlocked theme: ${metadata.itemId}`);
            }
        }

        // Process effect purchase
        processEffectPurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    effects: [...prev.effects, metadata.itemId]
                }));
                
                console.log(`Unlocked effect: ${metadata.itemId}`);
            }
        }

        // Process premium purchase
        processPremiumPurchase(payment, metadata) {
            if (typeof window.setUserInventory === 'function') {
                window.setUserInventory(prev => ({
                    ...prev,
                    premium: true
                }));
                
                console.log('Activated premium features');
            }
        }

        // Update user's Pi balance (if tracking locally)
        updateUserBalance(payment) {
            // In a real app, you would fetch the actual balance from Pi Network
            // For now, we'll just track spending
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

        // Clean up old completed payments (keep last 50)
        cleanupPaymentHistory() {
            try {
                const completed = this.loadCompletedPayments();
                if (completed.length > 50) {
                    const recent = completed.slice(-50);
                    localStorage.setItem(STORAGE_KEYS.COMPLETED_PAYMENTS, JSON.stringify(recent));
                    this.completedPayments = recent;
                }
            } catch (error) {
                console.error('Error cleaning up payment history:', error);
            }
        }
    }

    // Create global instance
    window.piPaymentService = new PiPaymentService();

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.piPaymentService.init();
            console.log('Pi Payment Service ready');
        } catch (error) {
            console.error('Failed to initialize Pi Payment Service:', error);
        }
    });

    // Export for module usage
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PiPaymentService;
    }

})();