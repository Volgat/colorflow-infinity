// Enhanced AI Service with Gemini API for ColorFlow Infinity Pi Network
// This service provides AI-powered game features using Google's Gemini API

(function() {
    console.log("Initializing AI Service with Gemini API...");
    
    // AI Service configuration
    const AI_CONFIG = {
        // API calls will be made through your backend to keep API key secure
        API_ENDPOINT: '/api/ai', // Your backend endpoint
        REQUEST_DELAY: 1200, // Minimum delay between requests (ms)
        MAX_RETRIES: 3,
        TIMEOUT: 8000 // Request timeout (ms)
    };

    // Enhanced AI Service with Pi Network integration
    window.aiService = (function() {
        // Internal state
        let requestQueue = [];
        let isProcessingQueue = false;
        let lastRequestTime = 0;
        let cache = {};

        // Fallback responses for offline/error scenarios
        const FALLBACK_RESPONSES = {
            challenge: [
                "Connect 5 pairs of the same color in less than 10 seconds!",
                "Try to maintain a combo of 3 or more!",
                "Connect the most distant points for more points!",
                "Use Pi to buy ColorBomb powerup to connect any colors!",
                "Create a combo of 10 for a special Pi bonus!",
                "Connect special points to earn more coins!",
                "Use the Magnet powerup to attract nearby points!",
                "Watch out for the passing time!",
                "Glowing special points are worth more points!",
                "Complete level-specific challenges for extra Pi rewards!",
                "Long-distance connections give more time bonuses!",
                "Try to reach the next level in under 30 seconds!",
                "Match colors quickly to maintain your combo multiplier!",
                "Look for patterns to maximize your score!",
                "Experiment with Pi-powered powerups for advanced strategies!"
            ],
            difficulty: ["easy", "medium", "hard", "expert"],
            levelDescription: [
                "A level with close points for easy combos and Pi earning opportunities.",
                "Various colored points arranged in circular patterns with Pi bonus zones.",
                "Red and blue points dominate with some special Pi-reward points.",
                "Balanced layout with bonus points at the extremities for Pi seekers.",
                "Dynamic level with points appearing in wave-like patterns.",
                "Dense configuration in the center with rare Pi-special points.",
                "Spiral pattern with alternating color points and Pi collection areas.",
                "Grid-based layout optimized for systematic Pi earning strategies."
            ],
            piIntegration: [
                "Spend Pi wisely on powerups for maximum score impact!",
                "Premium Pi features unlock exclusive game content!",
                "Pi Network connectivity enables global leaderboards!",
                "Earn game coins through Pi-powered achievement system!"
            ]
        };

        // Generate cache key for requests
        function generateCacheKey(type, playerData) {
            const keyData = {
                type,
                level: playerData.level,
                scoreRange: Math.floor(playerData.score / 100),
                isPiUser: playerData.isPiUser || false,
                premium: playerData.premium || false
            };
            return btoa(JSON.stringify(keyData));
        }

        // Get fallback response
        function getFallbackResponse(type) {
            const responses = FALLBACK_RESPONSES[type] || FALLBACK_RESPONSES.challenge;
            return responses[Math.floor(Math.random() * responses.length)];
        }

        // Enhanced API call through backend (secure)
        async function callBackendAI(prompt, retries = 0) {
            try {
                console.log("Calling backend AI service...");
                
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT);
                
                const response = await fetch(AI_CONFIG.API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        maxTokens: 1000,
                        temperature: 0.7
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    if (response.status === 429 && retries < AI_CONFIG.MAX_RETRIES) {
                        // Rate limit hit, retry with exponential backoff
                        const delay = Math.pow(2, retries) * 2000;
                        console.warn(`Rate limit hit, retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return callBackendAI(prompt, retries + 1);
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.result) {
                    console.log("Backend AI response received successfully");
                    return data.result;
                }
                
                throw new Error('Unexpected API response format');
            } catch (error) {
                console.warn('Backend AI error:', error);
                
                if (retries < AI_CONFIG.MAX_RETRIES && !error.name?.includes('Abort')) {
                    console.log(`Retrying API call (${retries + 1}/${AI_CONFIG.MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
                    return callBackendAI(prompt, retries + 1);
                }
                
                return null; // Will trigger fallback response
            }
        }

        // Queue management for rate limiting
        function enqueueRequest(requestFunc) {
            return new Promise((resolve, reject) => {
                requestQueue.push({ 
                    func: requestFunc, 
                    resolve, 
                    reject,
                    timestamp: Date.now()
                });
                
                if (!isProcessingQueue) {
                    processQueue();
                }
            });
        }

        async function processQueue() {
            if (requestQueue.length === 0) {
                isProcessingQueue = false;
                return;
            }
            
            isProcessingQueue = true;
            
            // Respect rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;
            
            if (timeSinceLastRequest < AI_CONFIG.REQUEST_DELAY) {
                await new Promise(resolve => 
                    setTimeout(resolve, AI_CONFIG.REQUEST_DELAY - timeSinceLastRequest)
                );
            }
            
            // Process next request
            const request = requestQueue.shift();
            
            try {
                lastRequestTime = Date.now();
                const result = await request.func();
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
            
            // Continue processing queue
            setTimeout(() => processQueue(), 100);
        }

        // Main AI service methods
        const aiService = {
            // Generate dynamic challenge with Pi Network context
            generateChallenge: async function(playerData) {
                try {
                    const cacheKey = generateCacheKey('challenge', playerData);
                    
                    if (cache[cacheKey]) {
                        console.log("Cache hit for challenge!");
                        return cache[cacheKey];
                    }
                    
                    return await enqueueRequest(async () => {
                        try {
                            const { level, score, preferences, isPiUser, premium } = playerData || { 
                                level: 1, 
                                score: 0, 
                                preferences: {
                                    distancePreference: 0.5,
                                    speedPreference: 0.5,
                                    patternPreference: 0.5,
                                    riskPreference: 0.5
                                },
                                isPiUser: false,
                                premium: false
                            };
                            
                            const piContext = isPiUser ? 
                                "The player is connected to Pi Network and can use Pi for purchases." : 
                                "The player should be encouraged to connect to Pi Network for enhanced features.";
                            
                            const premiumContext = premium ? 
                                "The player has premium status and access to Pi ads for extra rewards." : 
                                "The player can upgrade to premium using Pi for additional benefits.";
                            
                            const prompt = `
                            Create a dynamic gameplay challenge for ColorFlow Infinity, a Pi Network integrated color-matching game.
                            
                            Player Status:
                            - Level: ${level}
                            - Score: ${score}
                            - Distance preference: ${preferences?.distancePreference || 0.5}
                            - Speed preference: ${preferences?.speedPreference || 0.5}
                            - Pattern preference: ${preferences?.patternPreference || 0.5}
                            - Risk preference: ${preferences?.riskPreference || 0.5}
                            
                            Pi Network Context: ${piContext}
                            Premium Status: ${premiumContext}
                            
                            Generate ONE challenge sentence that:
                            1. Is motivating and exciting
                            2. Is maximum 15 words
                            3. Ends with an exclamation mark
                            4. References game mechanics appropriate for the player's level
                            5. Occasionally mentions Pi Network features (powerups, premium, etc.)
                            6. Adapts difficulty based on player preferences
                            
                            Examples:
                            - "Connect 5 pairs quickly to unlock your next Pi powerup!"
                            - "Master long-distance connections for premium Pi rewards!"
                            - "Use your Pi balance to buy the ColorBomb powerup!"
                            
                            Respond with ONLY the challenge sentence.
                            `;
                            
                            const result = await callBackendAI(prompt);
                            
                            if (!result) {
                                const fallback = getFallbackResponse('challenge');
                                cache[cacheKey] = fallback;
                                return fallback;
                            }
                            
                            let challenge = result.trim().replace(/^["']|["']$/g, '');
                            challenge = challenge.replace(/\n/g, ' ').trim();
                            
                            if (!challenge.endsWith('!')) {
                                challenge = challenge + '!';
                            }
                            
                            // Ensure it's not too long
                            if (challenge.split(' ').length > 15) {
                                challenge = challenge.split(' ').slice(0, 15).join(' ') + '!';
                            }
                            
                            cache[cacheKey] = challenge;
                            return challenge;
                            
                        } catch (error) {
                            console.error("Challenge generation error:", error);
                            const fallback = getFallbackResponse('challenge');
                            cache[cacheKey] = fallback;
                            return fallback;
                        }
                    });
                } catch (e) {
                    console.error("Error in generateChallenge:", e);
                    return getFallbackResponse('challenge');
                }
            },

            // Test connection to backend AI service
            testConnection: async function() {
                try {
                    const result = await callBackendAI("Respond with 'OK' to test the connection.");
                    return result?.includes('OK') || false;
                } catch (error) {
                    console.error('AI service test connection failed:', error);
                    return false;
                }
            },

            // Clear cache (for debugging or memory management)
            clearCache: function() {
                cache = {};
                console.log("AI service cache cleared");
            },

            // Get cache statistics
            getCacheStats: function() {
                return {
                    entries: Object.keys(cache).length,
                    queueLength: requestQueue.length,
                    isProcessing: isProcessingQueue
                };
            }
        };

        // Enhanced proxy to handle missing methods gracefully
        return new Proxy(aiService, {
            get: function(target, prop) {
                if (prop in target) {
                    return target[prop];
                }
                
                console.warn(`AI service method '${prop}' not found, using fallback`);
                return async function() {
                    return "AI service feature not available for this functionality";
                };
            }
        });
    })();

    // Signal that AI service is ready
    console.log("AI Service with secure backend is ready");
    if (typeof window.onAIServiceReady === 'function') {
        window.onAIServiceReady();
    }
    
    // Dispatch ready event
    const aiReadyEvent = new CustomEvent('ai-service-ready');
    document.dispatchEvent(aiReadyEvent);

    // Test connection on initialization
    setTimeout(() => {
        window.aiService.testConnection().then(connected => {
            console.log(`AI Service connection test: ${connected ? 'SUCCESS' : 'FAILED'}`);
            if (!connected) {
                console.warn('AI Service will use fallback responses');
            }
        });
    }, 1000);

})();