// api/pi-complete.js
// Server-side completion endpoint for Pi Network payments

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

    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed',
            message: 'Only POST requests are accepted'
        });
    }

    try {
        // Get Pi API key from environment
        const PI_API_KEY = process.env.PI_API_KEY;

        if (!PI_API_KEY) {
            console.error('PI_API_KEY not configured');
            return res.status(500).json({ 
                success: false,
                error: 'Server configuration error',
                message: 'Pi Network API key not configured'
            });
        }

        // Parse request body
        const { paymentId, txid } = req.body;

        if (!paymentId || !txid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Payment ID and transaction ID are required'
            });
        }

        console.log('🎯 Completing Pi payment:', paymentId, 'with txid:', txid);

        // Call Pi Network API to complete the payment
        const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                txid: txid
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pi API completion failed:', response.status, errorText);
            
            return res.status(500).json({
                success: false,
                error: 'Pi API completion failed',
                message: `Pi Network returned status ${response.status}`,
                details: errorText
            });
        }

        const paymentData = await response.json();
        console.log('✅ Payment completed successfully:', paymentData.identifier);

        // Log the successful transaction
        console.log('🎉 REAL Pi transaction completed:', {
            paymentId: paymentData.identifier,
            amount: paymentData.amount,
            memo: paymentData.memo,
            txid: paymentData.transaction?.txid,
            verified: paymentData.transaction?.verified,
            developerCompleted: paymentData.status?.developer_completed
        });

        return res.status(200).json({
            success: true,
            payment: paymentData,
            message: 'Payment completed successfully',
            realTransaction: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Payment completion error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Payment completion failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}