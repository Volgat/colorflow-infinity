// Secure Backend API for Gemini AI integration
// This file handles AI requests securely on the server side

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
            message: 'Only POST requests are accepted for AI operations'
        });
    }

    try {
        // Get Gemini API key from environment
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY not configured');
            return res.status(500).json({ 
                success: false,
                error: 'Server configuration error',
                message: 'AI service not properly configured'
            });
        }

        // Parse request body
        const { prompt, maxTokens = 1000, temperature = 0.7 } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Prompt is required'
            });
        }

        // Validate prompt length (security measure)
        if (prompt.length > 5000) {
            return res.status(400).json({
                success: false,
                error: 'Prompt too long',
                message: 'Prompt must be less than 5000 characters'
            });
        }

        console.log('Processing AI request:', {
            promptLength: prompt.length,
            maxTokens,
            temperature,
            timestamp: new Date().toISOString()
        });

        // Call Gemini API
        const geminiResponse = await callGeminiAPI(prompt, GEMINI_API_KEY, {
            maxTokens,
            temperature
        });

        if (!geminiResponse.success) {
            return res.status(500).json({
                success: false,
                error: 'AI service error',
                message: geminiResponse.error
            });
        }

        // Log successful processing
        console.log('AI request processed successfully');

        return res.status(200).json({
            success: true,
            result: geminiResponse.result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI API processing error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'AI processing failed',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
}

// Call Gemini API securely
async function callGeminiAPI(prompt, apiKey, options = {}) {
    const { maxTokens = 1000, temperature = 0.7 } = options;
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxTokens,
                        topP: 0.8,
                        topK: 40
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            
            return {
                success: false,
                error: `Gemini API error: ${response.status} - ${errorText}`
            };
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && 
            data.candidates[0].content.parts && 
            data.candidates[0].content.parts.length > 0) {
            
            const result = data.candidates[0].content.parts[0].text;
            return {
                success: true,
                result: result
            };
        }

        return {
            success: false,
            error: 'No valid response from Gemini API'
        };

    } catch (error) {
        console.error('Gemini API call error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Rate limiting helper (optional - implement if needed)
const requestCounts = new Map();

function isRateLimited(clientId, maxRequests = 60, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requestCounts.has(clientId)) {
        requestCounts.set(clientId, []);
    }
    
    const requests = requestCounts.get(clientId);
    
    // Remove old requests outside the window
    while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift();
    }
    
    // Check if limit exceeded
    if (requests.length >= maxRequests) {
        return true;
    }
    
    // Add current request
    requests.push(now);
    
    return false;
}

// Clean up old rate limit data periodically
setInterval(() => {
    const now = Date.now();
    const cutoff = now - 60000; // 1 minute
    
    for (const [clientId, requests] of requestCounts.entries()) {
        while (requests.length > 0 && requests[0] < cutoff) {
            requests.shift();
        }
        
        if (requests.length === 0) {
            requestCounts.delete(clientId);
        }
    }
}, 60000); // Clean every minute