// api/pi-approve.js
// Server-side approval endpoint for Pi Network payments

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
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Payment ID is required'
            });
        }

        console.log('💡 Approving Pi payment:', paymentId);

        // Call Pi Network API to approve the payment
        const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pi API approval failed:', response.status, errorText);
            
            return res.status(500).json({
                success: false,
                error: 'Pi API approval failed',
                message: `Pi Network returned status ${response.status}`,
                details: errorText
            });
        }

        const paymentData = await response.json();
        console.log('✅ Payment approved successfully:', paymentData.identifier);

        return res.status(200).json({
            success: true,
            payment: paymentData,
            message: 'Payment approved successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Payment approval error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Payment approval failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}