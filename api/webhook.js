// Pi Network Webhook Handler for ColorFlow Infinity
// This API endpoint handles Pi Network payment webhooks
// Deploy this as a Vercel serverless function

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only accept POST requests for webhooks
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'Only POST requests are accepted for Pi Network webhooks'
        });
    }

    try {
        // Get Pi Network API key from environment
        const PI_API_KEY = process.env.PI_API_KEY;
        const PI_WALLET_ADDRESS = process.env.PI_WALLET_ADDRESS;

        if (!PI_API_KEY) {
            console.error('PI_API_KEY not configured');
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: 'Pi Network API key not configured'
            });
        }

        // Parse webhook payload
        const { paymentId, txid, amount, memo, metadata, from_address, to_address, status } = req.body;

        console.log('Pi Network webhook received:', {
            paymentId,
            txid,
            amount,
            status,
            timestamp: new Date().toISOString()
        });

        // Validate required fields
        if (!paymentId || !txid || !amount || !status) {
            return res.status(400).json({
                error: 'Invalid webhook payload',
                message: 'Missing required fields: paymentId, txid, amount, status'
            });
        }

        // Validate payment destination
        if (to_address !== PI_WALLET_ADDRESS) {
            console.warn('Payment to wrong address:', to_address, 'Expected:', PI_WALLET_ADDRESS);
            return res.status(400).json({
                error: 'Invalid payment destination',
                message: 'Payment was not sent to the correct wallet address'
            });
        }

        // Process based on payment status
        let response;
        switch (status.toLowerCase()) {
            case 'approved':
                response = await handlePaymentApproved(paymentId, txid, amount, metadata);
                break;
            case 'completed':
                response = await handlePaymentCompleted(paymentId, txid, amount, metadata);
                break;
            case 'cancelled':
                response = await handlePaymentCancelled(paymentId, metadata);
                break;
            case 'failed':
                response = await handlePaymentFailed(paymentId, metadata);
                break;
            default:
                console.warn('Unknown payment status:', status);
                return res.status(400).json({
                    error: 'Unknown payment status',
                    message: `Status '${status}' is not recognized`
                });
        }

        // Log successful processing
        console.log('Webhook processed successfully:', {
            paymentId,
            status,
            response
        });

        return res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            paymentId,
            status,
            ...response
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        
        return res.status(500).json({
            error: 'Webhook processing failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Handle payment approved status
async function handlePaymentApproved(paymentId, txid, amount, metadata) {
    try {
        console.log('Processing payment approval:', paymentId);

        // Validate the payment with Pi Network API
        const isValid = await validatePaymentWithPi(paymentId, txid);
        
        if (!isValid) {
            throw new Error('Payment validation failed');
        }

        // Update payment status in your database/storage
        await updatePaymentStatus(paymentId, 'approved', {
            txid,
            approved_at: new Date().toISOString()
        });

        return {
            approved: true,
            message: 'Payment approved and validated'
        };
    } catch (error) {
        console.error('Payment approval error:', error);
        throw error;
    }
}

// Handle payment completed status
async function handlePaymentCompleted(paymentId, txid, amount, metadata) {
    try {
        console.log('Processing payment completion:', paymentId);

        // Validate the payment with Pi Network API
        const isValid = await validatePaymentWithPi(paymentId, txid);
        
        if (!isValid) {
            throw new Error('Payment validation failed');
        }

        // Update payment status
        await updatePaymentStatus(paymentId, 'completed', {
            txid,
            completed_at: new Date().toISOString()
        });

        // Process the purchase based on metadata
        const purchaseResult = await processPurchase(paymentId, amount, metadata);

        // Send confirmation notification (if you have user communication setup)
        await sendPurchaseConfirmation(paymentId, metadata, purchaseResult);

        return {
            completed: true,
            message: 'Payment completed and purchase processed',
            purchase: purchaseResult
        };
    } catch (error) {
        console.error('Payment completion error:', error);
        throw error;
    }
}

// Handle payment cancelled status
async function handlePaymentCancelled(paymentId, metadata) {
    try {
        console.log('Processing payment cancellation:', paymentId);

        // Update payment status
        await updatePaymentStatus(paymentId, 'cancelled', {
            cancelled_at: new Date().toISOString()
        });

        // Release any reserved items/resources
        await releaseReservedItems(paymentId, metadata);

        return {
            cancelled: true,
            message: 'Payment cancellation processed'
        };
    } catch (error) {
        console.error('Payment cancellation error:', error);
        throw error;
    }
}

// Handle payment failed status
async function handlePaymentFailed(paymentId, metadata) {
    try {
        console.log('Processing payment failure:', paymentId);

        // Update payment status
        await updatePaymentStatus(paymentId, 'failed', {
            failed_at: new Date().toISOString()
        });

        // Release any reserved items/resources
        await releaseReservedItems(paymentId, metadata);

        return {
            failed: true,
            message: 'Payment failure processed'
        };
    } catch (error) {
        console.error('Payment failure error:', error);
        throw error;
    }
}

// Validate payment with Pi Network API
async function validatePaymentWithPi(paymentId, txid) {
    try {
        const PI_API_KEY = process.env.PI_API_KEY;
        
        // Make API call to Pi Network to validate the payment
        const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Pi API validation failed: ${response.status}`);
        }

        const paymentData = await response.json();
        
        // Verify the transaction ID matches
        if (paymentData.transaction && paymentData.transaction.txid !== txid) {
            throw new Error('Transaction ID mismatch');
        }

        return true;
    } catch (error) {
        console.error('Pi payment validation error:', error);
        return false;
    }
}

// Update payment status in storage
async function updatePaymentStatus(paymentId, status, additionalData = {}) {
    try {
        // In a real application, you would update your database here
        // For this example, we'll just log the update
        
        const updateData = {
            paymentId,
            status,
            updated_at: new Date().toISOString(),
            ...additionalData
        };

        console.log('Payment status updated:', updateData);

        // Example database update (replace with your actual database logic):
        // await db.payments.update({ paymentId }, updateData);
        
        return updateData;
    } catch (error) {
        console.error('Payment status update error:', error);
        throw error;
    }
}

// Process purchase based on metadata
async function processPurchase(paymentId, amount, metadata) {
    try {
        if (!metadata || !metadata.type) {
            throw new Error('Invalid purchase metadata');
        }

        const purchaseResult = {
            paymentId,
            amount,
            type: metadata.type,
            processed_at: new Date().toISOString()
        };

        switch (metadata.type) {
            case 'powerup':
                purchaseResult.powerup = await processPowerupPurchase(metadata);
                break;
            
            case 'coins':
                purchaseResult.coins = await processCoinsPurchase(metadata);
                break;
            
            case 'theme':
                purchaseResult.theme = await processThemePurchase(metadata);
                break;
            
            case 'effect':
                purchaseResult.effect = await processEffectPurchase(metadata);
                break;
            
            case 'premium':
                purchaseResult.premium = await processPremiumPurchase(metadata);
                break;
            
            default:
                throw new Error(`Unknown purchase type: ${metadata.type}`);
        }

        console.log('Purchase processed:', purchaseResult);
        return purchaseResult;
    } catch (error) {
        console.error('Purchase processing error:', error);
        throw error;
    }
}

// Process different types of purchases
async function processPowerupPurchase(metadata) {
    // Process powerup purchase
    return {
        powerupType: metadata.powerupType,
        activated: true
    };
}

async function processCoinsPurchase(metadata) {
    // Process coins purchase
    const pack = getPiCoinPack(metadata.itemId);
    return {
        coins_added: pack.amount + pack.bonus,
        pack_type: metadata.itemId
    };
}

async function processThemePurchase(metadata) {
    // Process theme purchase
    return {
        theme_unlocked: metadata.itemId,
        activated: true
    };
}

async function processEffectPurchase(metadata) {
    // Process effect purchase
    return {
        effect_unlocked: metadata.itemId,
        activated: true
    };
}

async function processPremiumPurchase(metadata) {
    // Process premium purchase
    return {
        premium_activated: true,
        benefits: ['ads', 'bonus_coins', 'themes', 'daily_powerups']
    };
}

// Helper function to get coin pack details
function getPiCoinPack(packId) {
    const packs = {
        small: { amount: 500, bonus: 50 },
        medium: { amount: 1200, bonus: 150 },
        large: { amount: 2500, bonus: 400 },
        mega: { amount: 6000, bonus: 1200 }
    };
    
    return packs[packId] || { amount: 0, bonus: 0 };
}

// Release reserved items (for cancelled/failed payments)
async function releaseReservedItems(paymentId, metadata) {
    try {
        // In a real application, you might have reserved items during payment creation
        // This function would release those reservations
        
        console.log('Releasing reserved items for payment:', paymentId);
        
        // Example: Remove from reserved inventory, cancel temporary upgrades, etc.
        
        return { released: true };
    } catch (error) {
        console.error('Error releasing reserved items:', error);
        throw error;
    }
}

// Send purchase confirmation (optional)
async function sendPurchaseConfirmation(paymentId, metadata, purchaseResult) {
    try {
        // In a real application, you might send notifications to the user
        // via email, push notifications, or in-game messaging
        
        console.log('Sending purchase confirmation:', {
            paymentId,
            type: metadata.type,
            result: purchaseResult
        });
        
        // Example: Send email, push notification, etc.
        
        return { sent: true };
    } catch (error) {
        console.error('Error sending purchase confirmation:', error);
        // Don't throw here - confirmation failure shouldn't fail the webhook
        return { sent: false, error: error.message };
    }
}