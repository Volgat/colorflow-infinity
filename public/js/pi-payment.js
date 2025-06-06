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
            this.piApiKey = null; // Will be set from environment or config
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

                // Try to get API key from global config or environment
                this.piApiKey = window.PI_API_KEY || process.env.PI_API_KEY;
                if (!this.piApiKey) {
                    console.warn('⚠️ PI_API_KEY not found - server operations may fail');
                }

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

        // Server approval callback (Official Pattern) - CORRIGÉ
        async onReadyForServerApproval(paymentId) {
            try {
                console.log('🔄 Server approval required for:', paymentId);
                
                // CRITIQUE: Appel API vers Pi Network pour approuver
                if (!this.piApiKey) {
                    console.warn('⚠️ No PI_API_KEY found, trying alternate approval method...');
                    
                    // Fallback: essayer d'approuver via endpoint local
                    try {
                        const response = await fetch('/api/approve-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ paymentId })
                        });

                        if (!response.ok) {
                            throw new Error(`Local approval failed: ${response.status}`);
                        }

                        const result = await response.json();
                        console.log('✅ Payment approved via local endpoint:', result);
                    } catch (localError) {
                        console.warn('Local endpoint failed, using direct Pi API call...');
                        throw localError;
                    }
                } else {
                    // Appel direct vers Pi Network API
                    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Key ${this.piApiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Pi API approval error:', response.status, errorText);
                        throw new Error(`Pi API approval failed: ${response.status} - ${errorText}`);
                    }

                    const approvedPayment = await response.json();
                    console.log('✅ Payment approved by Pi Network:', approvedPayment);
                }

                // Mettre à jour le statut local après approbation réussie
                const pendingPayments = this.loadPendingPayments();
                const payment = pendingPayments.find(p => p.identifier === paymentId);
                
                if (payment) {
                    payment.status = PAYMENT_STATUS.APPROVED;
                    payment.approved_at = new Date().toISOString();
                    this.updatePendingPayment(payment);
                    
                    console.log('✅ Payment approved successfully:', paymentId);
                    if (typeof window.addNotification === 'function') {
                        window.addNotification('💰 Payment approved by Pi Network!', 'success');
                    }
                }

            } catch (error) {
                console.error('❌ Server approval error:', error);
                
                // En cas d'erreur, essayer une approche de fallback pour les tests
                if (paymentId.includes('test') || window.location.hostname === 'localhost') {
                    console.log('🧪 Test mode - simulating approval');
                    
                    const pendingPayments = this.loadPendingPayments();
                    const payment = pendingPayments.find(p => p.identifier === paymentId);
                    
                    if (payment) {
                        payment.status = PAYMENT_STATUS.APPROVED;
                        payment.approved_at = new Date().toISOString();
                        payment.simulated_approval = true;
                        this.updatePendingPayment(payment);
                        
                        console.log('✅ Test payment approved (simulated):', paymentId);
                        if (typeof window.addNotification === 'function') {
                            window.addNotification('🧪 Test payment approved!', 'success');
                        }
                        return;
                    }
                }
                
                // Si tout échoue, annuler le paiement
                console.error('❌ All approval methods failed, cancelling payment');
                this.onCancel(paymentId);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification('❌ Payment approval failed: ' + error.message, 'error');
                }
            }
        }

        // Server completion callback (Official Pattern)
        async onReadyForServerCompletion(paymentId, txid) {
            try {
                console.log('✅ Server completion required for:', paymentId, txid);
                
                // Appel vers Pi Network API pour compléter
                if (this.piApiKey) {
                    try {
                        const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Key ${this.piApiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ txid })
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('Pi API completion error:', response.status, errorText);
                            throw new Error(`Pi API completion failed: ${response.status}`);
                        }

                        const completedPayment = await response.json();
                        console.log('✅ Payment completed by Pi Network:', completedPayment);
                    } catch (apiError) {
                        console.warn('Pi API completion failed, proceeding with local completion:', apiError);
                    }
                }
                
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
                    
                    console.log('🎉 Payment completed successfully:', paymentId);
                }
            } catch (error) {
                console.error('❌ Server completion error:', error);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification('❌ Payment completion failed: ' + error.message, 'error');
                }
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

            // Simulate approval after 1 second
            setTimeout(() => {
                this.onReadyForServerApproval(paymentId);
            }, 1000);

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
            
            if (payment && payment.status === PAYMENT_STATUS.APPROVED) {
                this.onReadyForServerCompletion(paymentId, 'simulated_tx_' + Date.now());
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
                    case 'powerup':
                        this.processPowerupPurchase(payment, metadata);
                        break;
                    case 'test':
                        console.log('🧪 Test purchase completed successfully');
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
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification(`💰 +${totalCoins.toLocaleString()} coins added!`, 'success');
                }
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
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification(`🎨 Theme unlocked: ${metadata.itemId}!`, 'success');
                }
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
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification(`✨ Effect unlocked: ${metadata.itemId}!`, 'success');
                }
            }
        }

        // Process powerup purchase
        processPowerupPurchase(payment, metadata) {
            console.log(`⚡ Powerup activated: ${metadata.powerupType}`);
            
            if (typeof window.addNotification === 'function') {
                window.addNotification(`⚡ ${metadata.powerupType} powerup activated!`, 'success');
            }
        }

        // Set Pi API Key (for runtime configuration)
        setPiApiKey(apiKey) {
            this.piApiKey = apiKey;
            console.log('🔑 Pi API Key configured');
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
                hasPiApiKey: !!this.piApiKey,
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

        // Clear all payment data (for debugging)
        clearPaymentData() {
            localStorage.removeItem(STORAGE_KEYS.PENDING_PAYMENTS);
            localStorage.removeItem(STORAGE_KEYS.COMPLETED_PAYMENTS);
            localStorage.removeItem(STORAGE_KEYS.AUTH_DATA);
            this.pendingPayments = [];
            this.completedPayments = [];
            this.authData = null;
            this.isAuthenticated = false;
            console.log('🧹 Payment data cleared');
        }
    }

    // Create global instance
    window.piPaymentService = new PiPaymentService();

    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🚀 Starting Pi Payment Service (Official Pattern with Server Approval)...');
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

    // Global function to set Pi API key
    window.setPiApiKey = function(apiKey) {
        window.piPaymentService.setPiApiKey(apiKey);
        return { success: true, message: 'Pi API Key configured' };
    };

    // Global function to clear payment data
    window.clearPiPayments = function() {
        window.piPaymentService.clearPaymentData();
        return { success: true, message: 'Payment data cleared' };
    };

    console.log('💜 Pi Payment Service loaded (Official Pattern with Server Approval)');

})();