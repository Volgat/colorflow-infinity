// api/create-real-pi-payment.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const PI_API_KEY = process.env.PI_API_KEY;
        const { amount, memo, metadata, accessToken } = req.body;

        console.log('Creating Pi payment with Platform API...');

        // Étape 1: Vérifier l'utilisateur avec le token
        const userResponse = await fetch('https://api.minepi.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!userResponse.ok) {
            throw new Error('User verification failed');
        }

        const user = await userResponse.json();
        console.log('User verified:', user.uid);

        // Étape 2: Créer le paiement pour cet utilisateur
        const paymentData = {
            amount: parseFloat(amount),
            memo: memo,
            metadata: metadata,
            uid: user.uid
        };

        const paymentResponse = await fetch('https://api.minepi.com/v2/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        if (!paymentResponse.ok) {
            const errorText = await paymentResponse.text();
            console.error('Payment creation failed:', errorText);
            throw new Error(`Payment failed: ${errorText}`);
        }

        const payment = await paymentResponse.json();
        console.log('✅ REAL Pi payment created:', payment);

        res.status(200).json({
            success: true,
            payment: payment,
            realTransaction: true,
            message: 'Real Pi payment created successfully!'
        });

    } catch (error) {
        console.error('Real Pi payment error:', error);
        res.status(500).json({
            error: 'Real payment failed',
            message: error.message
        });
    }
}