// api/pi-config.js - Version corrigée
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Vérifier que les variables d'environnement sont définies
        const piApiKey = process.env.PI_API_KEY;
        const piWalletAddress = process.env.PI_WALLET_ADDRESS;

        if (!piApiKey) {
            console.error('PI_API_KEY not configured in environment variables');
            return res.status(500).json({ 
                error: 'Pi API key not configured',
                configured: false,
                message: 'Please set PI_API_KEY in your environment variables'
            });
        }

        if (!piWalletAddress) {
            console.error('PI_WALLET_ADDRESS not configured in environment variables');
            return res.status(500).json({ 
                error: 'Pi wallet address not configured',
                configured: false,
                message: 'Please set PI_WALLET_ADDRESS in your environment variables'
            });
        }

        // Tester la validité de la clé API
        try {
            const testResponse = await fetch('https://api.minepi.com/v2/me', {
                headers: {
                    'Authorization': `Key ${piApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!testResponse.ok) {
                console.error('Pi API key test failed:', testResponse.status);
                return res.status(500).json({
                    error: 'Invalid Pi API key',
                    configured: false,
                    message: 'Pi API key is invalid or expired'
                });
            }
        } catch (testError) {
            console.error('Pi API test error:', testError);
            return res.status(500).json({
                error: 'Cannot connect to Pi Network',
                configured: false,
                message: 'Unable to connect to Pi Network servers'
            });
        }

        res.status(200).json({
            success: true,
            hasApiKey: true,
            hasWalletAddress: true,
            apiKeyValid: true,
            walletAddress: piWalletAddress,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Pi config endpoint error:', error);
        res.status(500).json({ 
            error: 'Configuration failed',
            message: error.message 
        });
    }
}