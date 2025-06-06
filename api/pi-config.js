// api/pi-config.js
export default async function handler(req, res) {
    // Seulement GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Vérification de sécurité basique
        const userAgent = req.headers['user-agent'] || '';
        const referer = req.headers.referer || '';
        const host = req.headers.host || '';
        
        // Autoriser seulement depuis votre domaine ou Pi Browser
        const isValidRequest = 
            host.includes('colorflowinfinity.pw') ||
            host.includes('vercel.app') ||
            userAgent.includes('PiBrowser') ||
            userAgent.includes('Pi Browser') ||
            referer.includes('colorflowinfinity.pw');

        if (!isValidRequest && process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Unauthorized domain' });
        }

        // Récupérer la clé API depuis les variables d'environnement
        const piApiKey = process.env.PI_API_KEY;
        const piWalletAddress = process.env.PI_WALLET_ADDRESS;

        if (!piApiKey) {
            return res.status(500).json({ 
                error: 'Pi API key not configured',
                configured: false
            });
        }

        // Retourner la clé (masquée pour les logs)
        res.status(200).json({
            success: true,
            hasApiKey: true,
            apiKey: piApiKey, // En production, vous pourriez vouloir la masquer partiellement
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