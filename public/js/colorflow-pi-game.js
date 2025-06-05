// ColorFlow Infinity game - Version complète avec économie Pi Network

(function() {
    // Verify dependencies
    if (!window.React || !window.ReactDOM) {
        console.error("React or ReactDOM not loaded. Game cannot start.");
        return;
    }
    
    // Extract React hooks
    const { useState, useEffect, useCallback, useRef, createContext, useContext } = React;
    
    // Create context
    const AppContext = createContext(null);

    // Colors configuration - Base palette
    const BASE_COLORS = [
        { name: 'blue', value: '#3b82f6' },
        { name: 'red', value: '#ef4444' },
        { name: 'green', value: '#22c55e' },
        { name: 'purple', value: '#9333ea' },
        { name: 'pink', value: '#ec4899' }
    ];

    // Theme colors configuration
    let THEME_COLORS = {
        default: BASE_COLORS,
        neon: [
            { name: 'neon-pink', value: '#ff00ff' },
            { name: 'neon-green', value: '#00ff00' },
            { name: 'neon-red', value: '#ff0000' },
            { name: 'neon-blue', value: '#00ffff' },
            { name: 'neon-yellow', value: '#ffff00' }
        ],
        aqua: [
            { name: 'aqua-teal', value: '#00f2ff' },
            { name: 'aqua-blue', value: '#0077be' },
            { name: 'aqua-green', value: '#50c878' },
            { name: 'aqua-turquoise', value: '#40e0d0' },
            { name: 'aqua-mint', value: '#7fffd4' }
        ],
        space: [
            { name: 'space-purple', value: '#663399' },
            { name: 'space-orchid', value: '#9932cc' },
            { name: 'space-violet', value: '#9400d3' },
            { name: 'space-blue', value: '#8a2be2' },
            { name: 'space-lavender', value: '#9370db' }
        ],
        amega: [
            { name: 'fixio-gold', value: '#FFD700' },
            { name: 'fixio-orange', value: '#FF8C00' },
            { name: 'fixio-purple', value: '#9932CC' },
            { name: 'fixio-blue', value: '#4169E1' },
            { name: 'fixio-green', value: '#32CD32' }
        ]
    };

    window.THEME_COLORS = THEME_COLORS;

    // Difficulty configuration
    const DIFFICULTIES = {
        easy: {
            basePoints: 15,
            multiplier: 1.3,
            timeLimit: 20,
            label: 'EASY',
            color: 'bg-green-500'
        },
        medium: {
            basePoints: 30,
            multiplier: 1.6,
            timeLimit: 18,
            unlockLevel: 3,
            label: 'MEDIUM',
            color: 'bg-yellow-500'
        },
        hard: {
            basePoints: 60,
            multiplier: 2.2,
            timeLimit: 15,
            unlockLevel: 5,
            label: 'HARD',
            color: 'bg-red-500'
        },
        expert: {
            basePoints: 120,
            multiplier: 3.5,
            timeLimit: 12,
            unlockLevel: 7,
            label: 'EXPERT',
            color: 'bg-purple-500'
        }
    };

    // Powerups configuration (prix en Pi)
    const POWERUPS = {
        timeSlow: {
            icon: "fas fa-clock",
            activeIcon: "fas fa-clock text-yellow-300",
            activeClass: "bg-purple-600",
            duration: 15000,
            cooldown: 25000,
            price: 0.02, // Prix en Pi
            effect: "Freezes time for 15 seconds"
        },
        magnet: {
            icon: "fas fa-magnet",
            activeIcon: "fas fa-magnet text-blue-400",
            activeClass: "bg-blue-600",
            duration: 8000,
            cooldown: 20000,
            price: 0.015, // Prix en Pi
            effect: "Attracts points to center"
        },
        colorBomb: {
            icon: "fas fa-bomb",
            activeIcon: "fas fa-bomb text-red-500",
            activeClass: "bg-red-600",
            duration: 2000,
            cooldown: 30000,
            price: 0.03, // Prix en Pi
            effect: "Destroys 1/3 of all points"
        },
        doublePoints: {
            icon: "fas fa-bolt",
            activeIcon: "fas fa-bolt text-yellow-300",
            activeClass: "bg-yellow-600",
            duration: 10000,
            cooldown: 25000,
            price: 0.025, // Prix en Pi
            effect: "Triple points for 10 seconds"
        }
    };

    // Store configuration avec TOUS les prix en Pi Network
    const STORE_ITEMS = {
        coinPacks: {
            starter: { 
                coins: 200, 
                price: 0, // Gratuit - vidéo pub 
                bonus: 50, 
                name: 'Starter Pack',
                icon: 'fas fa-gift',
                description: 'Watch an ad to get free coins',
                type: 'ad'
            },
            small: { 
                coins: 500, 
                price: 1.0, // Prix en Pi
                bonus: 100, 
                name: 'Small Pack',
                icon: 'fas fa-coins',
                description: '500 + 100 bonus coins',
                type: 'pi'
            },
            medium: { 
                coins: 1200, 
                price: 1.5, // Prix en Pi
                bonus: 300, 
                name: 'Medium Pack',
                icon: 'fas fa-money-bill',
                description: '1200 + 300 bonus coins',
                type: 'pi'
            },
            large: { 
                coins: 2500, 
                price: 2.0, // Prix en Pi
                bonus: 750, 
                name: 'Large Pack',
                icon: 'fas fa-treasure-chest',
                description: '2500 + 750 bonus coins',
                type: 'pi'
            },
            mega: { 
                coins: 6000, 
                price: 5.0, // Prix en Pi
                bonus: 2000, 
                name: 'Mega Pack',
                icon: 'fas fa-crown',
                description: '6000 + 2000 bonus coins - Best Value!',
                type: 'pi'
            }
        },
        themes: {
            default: { id: 'default', name: 'Classic', price: 0, icon: 'fas fa-palette', description: 'Original ColorFlow colors', type: 'free' },
            neon: { id: 'neon', name: 'Neon Lights', price: 0.005, colors: THEME_COLORS.neon, icon: 'fas fa-lightbulb', description: 'Bright electric colors', type: 'pi' },
            aqua: { id: 'aqua', name: 'Ocean Depth', price: 0.8, colors: THEME_COLORS.aqua, icon: 'fas fa-water', description: 'Deep sea blues and greens', type: 'pi' },
            space: { id: 'space', name: 'Galaxy', price: 1.2, colors: THEME_COLORS.space, icon: 'fas fa-rocket', description: 'Cosmic purples and blues', type: 'pi' },
            amega: { id: 'fixio', name: 'Fixio Blur', price: 2.0, colors: THEME_COLORS.amega, icon: 'fas fa-crown', description: 'Premium studio theme', type: 'pi' }
        },
        effects: {
            default: { id: 'default', name: 'Classic', price: 0, icon: 'fas fa-star', description: 'Standard visual effects', type: 'free' },
            sparkle: { id: 'sparkle', name: 'Sparkle', price: 0.6, icon: 'fas fa-star', description: 'Glittering star effects', type: 'pi' },
            trail: { id: 'trail', name: 'Neon Trail', price: 1.0, icon: 'fas fa-fire', description: 'Glowing connection trails', type: 'pi' },
            explosion: { id: 'explosion', name: 'Star Burst', price: 1.5, icon: 'fas fa-bomb', description: 'Explosive point effects', type: 'pi' }
        }
    };

    window.STORE_ITEMS = STORE_ITEMS;

    // Adaptive Point Generator
    class AdaptivePointGenerator {
        constructor() {
            this.minDistance = 80;
            this.maxDistance = Math.min(window.innerWidth, window.innerHeight) * 0.6;
            this.aiGeneratedThemes = new Map();
            this.currentLevelConfig = null;
        }

        async generateAdaptivePoints(level, currentDifficulty, themeId, effectId) {
            console.log(`Generating points for level ${level}, difficulty ${currentDifficulty}, theme ${themeId}`);
            
            // Essayer d'obtenir une configuration IA
            try {
                if (window.aiService && typeof window.aiService.generateLevelConfiguration === 'function') {
                    this.currentLevelConfig = await window.aiService.generateLevelConfiguration({
                        level,
                        difficulty: currentDifficulty,
                        theme: themeId
                    });
                    console.log('AI Level Config:', this.currentLevelConfig);
                }
            } catch (error) {
                console.warn('IA level generation failed, using fallback:', error);
            }

            const currentThemeColors = await this.getThemeColors(themeId);
            return this.generateAdaptivePointsWithTheme(level, currentDifficulty, currentThemeColors, effectId);
        }

        async getThemeColors(themeId) {
            if (THEME_COLORS[themeId]) {
                return THEME_COLORS[themeId];
            }

            if (this.aiGeneratedThemes.has(themeId)) {
                return this.aiGeneratedThemes.get(themeId);
            }

            try {
                if (window.aiService && typeof window.aiService.generateThemeData === 'function') {
                    console.log(`Generating AI theme for: ${themeId}`);
                    const aiThemeData = await window.aiService.generateThemeData(themeId);
                    
                    if (aiThemeData && aiThemeData.colors) {
                        const themeColors = aiThemeData.colors.map((color, index) => ({
                            name: color.name || `ai-color-${index}`,
                            value: color.value
                        }));
                        
                        this.aiGeneratedThemes.set(themeId, themeColors);
                        THEME_COLORS[themeId] = themeColors;
                        window.THEME_COLORS = THEME_COLORS;
                        
                        console.log(`AI theme generated for ${themeId}:`, themeColors);
                        return themeColors;
                    }
                }
            } catch (error) {
                console.warn(`Failed to generate AI theme for ${themeId}:`, error);
            }

            return BASE_COLORS;
        }

        async generateAdaptivePointsWithTheme(level, currentDifficulty, themeColors, effectStyle) {
            const points = [];
            const pairCount = this.calculatePairCount(level, currentDifficulty);

            console.log(`Generating ${pairCount} pairs with theme colors:`, themeColors);

            for (let i = 0; i < pairCount; i++) {
                const pair = this.generateAdaptivePairWithTheme(themeColors, effectStyle);
                points.push(...pair);
            }

            return this.balancePointDistribution(points);
        }

        calculatePairCount(level, difficulty) {
            if (this.currentLevelConfig && this.currentLevelConfig.pairCount) {
                return Math.max(3, Math.min(10, this.currentLevelConfig.pairCount));
            }
            
            const basePairCount = Math.max(3, Math.floor(level / 2) + 2);
            const difficultyMultiplier = {
                easy: 1,
                medium: 1.2,
                hard: 1.5,
                expert: 2.0
            };
            
            return Math.min(10, Math.floor(basePairCount * difficultyMultiplier[difficulty || 'easy']));
        }

        generateAdaptivePairWithTheme(themeColors, effectStyle) {
            const isMobile = window.innerWidth <= 768;
            const safeMargins = {
                top: isMobile ? 140 : 170,
                right: isMobile ? 100 : 140,
                bottom: isMobile ? 100 : 120,
                left: isMobile ? 40 : 100
            };

            let basePoint = {
                x: safeMargins.left + Math.random() * (window.innerWidth - safeMargins.left - safeMargins.right),
                y: safeMargins.top + Math.random() * (window.innerHeight - safeMargins.top - safeMargins.bottom)
            };

            let distance = this.minDistance + Math.random() * (this.maxDistance - this.minDistance) * 0.4;
            
            if (this.currentLevelConfig && this.currentLevelConfig.layout) {
                switch (this.currentLevelConfig.layout) {
                    case 'circular':
                        distance = this.minDistance * 1.8;
                        break;
                    case 'linear':
                        distance = this.minDistance * 2.2;
                        break;
                    case 'clustered':
                        distance = this.minDistance * 1.0;
                        break;
                    default:
                        distance = this.minDistance + Math.random() * (this.maxDistance - this.minDistance) * 0.5;
                }
            }

            const angle = Math.random() * Math.PI * 2;
            const secondPoint = {
                x: basePoint.x + Math.cos(angle) * distance,
                y: basePoint.y + Math.sin(angle) * distance
            };

            this.adjustPointPosition(secondPoint, safeMargins);

            const color = themeColors[Math.floor(Math.random() * themeColors.length)];
            
            let specialChance = 0.3;
            if (this.currentLevelConfig && this.currentLevelConfig.specialPointChance) {
                specialChance = this.currentLevelConfig.specialPointChance;
            }
            
            const isSpecial = Math.random() < specialChance;

            return [
                {
                    id: Date.now() + Math.random(),
                    x: basePoint.x,
                    y: basePoint.y,
                    color,
                    isSpecial,
                    effectStyle,
                    zIndex: 200
                },
                {
                    id: Date.now() + Math.random() + 1,
                    x: secondPoint.x,
                    y: secondPoint.y,
                    color,
                    isSpecial,
                    effectStyle,
                    zIndex: 200
                }
            ];
        }

        adjustPointPosition(point, margins) {
            point.x = Math.max(margins.left, Math.min(window.innerWidth - margins.right, point.x));
            point.y = Math.max(margins.top, Math.min(window.innerHeight - margins.bottom, point.y));
        }

        balancePointDistribution(points) {
            const minSpacing = this.minDistance * 0.8;
            
            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    const dx = points[j].x - points[i].x;
                    const dy = points[j].y - points[i].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minSpacing) {
                        const angle = Math.atan2(dy, dx);
                        const moveDistance = (minSpacing - distance) / 2;
                        
                        points[i].x -= Math.cos(angle) * moveDistance;
                        points[i].y -= Math.sin(angle) * moveDistance;
                        points[j].x += Math.cos(angle) * moveDistance;
                        points[j].y += Math.sin(angle) * moveDistance;
                    }
                }
            }
            
            return points;
        }

        getCurrentLevelDescription() {
            if (this.currentLevelConfig && this.currentLevelConfig.description) {
                return this.currentLevelConfig.description;
            }
            return null;
        }
    }

    // UI Components

    // ScorePopup - Points animation
    const ScorePopup = ({ points, x, y }) => {
        return React.createElement('div', {
            className: 'absolute text-white font-bold text-xl md:text-2xl pointer-events-none animate-score',
            style: { left: x, top: y, zIndex: 1500 }
        }, '+' + points);
    };

    // CoinAnimation - Animation pour les coins gagnés
    const CoinAnimation = ({ x, y, coins }) => {
        return React.createElement('div', {
            className: 'absolute pointer-events-none animate-score z-50',
            style: { left: x, top: y }
        }, [
            React.createElement('div', {
                className: 'flex items-center text-yellow-300 font-bold text-lg',
                key: 'coin-text'
            }, [
                React.createElement('i', { className: 'fas fa-coins mr-1' }),
                `+${coins}`
            ])
        ]);
    };

    // LevelDescription
    const LevelDescription = ({ description, level }) => {
        if (!description) return null;
        
        return React.createElement('div', {
            className: 'fixed bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-4 text-white text-center z-40',
            style: { maxWidth: '500px', margin: '0 auto' }
        }, [
            React.createElement('div', {
                className: 'text-sm font-bold text-purple-300 mb-1',
                key: 'level-label'
            }, `Level ${level} - AI Generated Layout`),
            React.createElement('div', {
                className: 'text-sm',
                key: 'description'
            }, description)
        ]);
    };

    // TimerDisplay - Affichage du timer réparé
    const TimerDisplay = ({ gameTime, isActive }) => {
        const isLowTime = gameTime < 5;
        const isVeryLowTime = gameTime < 3;
        
        return React.createElement('div', {
            className: `text-2xl md:text-3xl font-bold transition-all duration-300 ${
                isVeryLowTime ? 'text-red-400 animate-pulse' : 
                isLowTime ? 'text-orange-400' : 'text-white'
            }`,
            style: {
                textShadow: isLowTime ? '0 0 15px currentColor' : 'none',
                transform: isVeryLowTime ? 'scale(1.1)' : 'scale(1)'
            }
        }, Math.round(Math.max(0, gameTime)) + 's');
    };

    // SettingsButton
    const SettingsButton = ({ onClick }) => {
        return React.createElement('button', {
            className: 'fixed top-4 right-4 w-10 h-10 md:w-12 md:h-12 bg-black/30 backdrop-blur-md rounded-xl flex items-center justify-center text-white shadow-lg z-30',
            onClick: onClick
        }, React.createElement('i', { className: 'fas fa-cog text-lg md:text-xl' }));
    };

    // HomeButton
    const HomeButton = ({ onClick }) => {
        return React.createElement('button', {
            className: 'home-button',
            onClick: onClick,
            'aria-label': 'Return Home'
        }, React.createElement('i', { className: 'fas fa-home text-lg' }));
    };

    // ShareButton
    const ShareButton = ({ onClick, score, level }) => {
        return React.createElement('button', {
            className: 'fixed top-4 right-20 w-10 h-10 md:w-12 md:h-12 bg-black/30 backdrop-blur-md rounded-xl flex items-center justify-center text-white shadow-lg z-30',
            onClick: () => onClick(score, level),
            'aria-label': 'Share Score'
        }, React.createElement('i', { className: 'fas fa-share-alt text-lg md:text-xl' }));
    };

    // ConfirmModal
    const ConfirmModal = ({ show, message, onConfirm, onCancel }) => {
        if (!show) return null;
        
        return React.createElement('div', {
            className: 'confirm-modal',
            onClick: onCancel
        },
            React.createElement('div', {
                className: 'confirm-box',
                onClick: e => e.stopPropagation()
            }, [
                React.createElement('h3', { 
                    className: 'text-xl font-bold mb-3',
                    key: 'title'
                }, 'Confirmation'),
                
                React.createElement('p', {
                    key: 'message'
                }, message),
                
                React.createElement('div', {
                    className: 'button-group',
                    key: 'buttons'
                }, [
                    React.createElement('button', {
                        className: 'confirm-button',
                        onClick: onConfirm,
                        key: 'confirm'
                    }, 'Yes'),
                    
                    React.createElement('button', {
                        className: 'cancel-button',
                        onClick: onCancel,
                        key: 'cancel'
                    }, 'No')
                ])
            ])
        );
    };

    // SettingsModal
    const SettingsModal = ({ show, settings, onClose, setSettings }) => {
        if (!show) return null;
        
        return React.createElement('div', {
            className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50',
            onClick: onClose
        }, 
            React.createElement('div', {
                className: 'bg-gray-800/90 rounded-xl p-6 m-4 max-w-sm w-full',
                onClick: e => e.stopPropagation()
            }, [
                React.createElement('div', {
                    className: 'flex justify-between items-center mb-4',
                    key: 'header'
                }, [
                    React.createElement('h2', { className: 'text-2xl font-bold text-white' }, 'Settings'),
                    React.createElement('button', {
                        className: 'w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20',
                        onClick: onClose
                    }, React.createElement('i', { className: 'fas fa-times' }))
                ]),
                
                React.createElement('div', { className: 'space-y-6', key: 'controls' }, [
                    // Volume slider
                    React.createElement('div', { key: 'volume' }, [
                        React.createElement('label', { className: 'text-white mb-2 block' }, 'Volume'),
                        React.createElement('input', {
                            type: 'range',
                            min: '0',
                            max: '1',
                            step: '0.1',
                            value: settings.volume,
                            onChange: e => setSettings(prev => ({
                                ...prev,
                                volume: parseFloat(e.target.value)
                            })),
                            className: 'w-full accent-purple-500'
                        })
                    ]),
                    
                    // Sound toggle
                    React.createElement('div', { 
                        className: 'flex items-center justify-between',
                        key: 'sound'
                    }, [
                        React.createElement('span', { className: 'text-white' }, 'Sound'),
                        React.createElement('button', {
                            className: `w-14 h-8 rounded-full relative transition-colors duration-200 ${
                                settings.isMuted ? 'bg-gray-600' : 'bg-purple-600'
                            }`,
                            onClick: () => setSettings(prev => ({
                                ...prev,
                                isMuted: !prev.isMuted
                            }))
                        }, React.createElement('div', {
                            className: 'absolute w-6 h-6 bg-white rounded-full',
                            style: {
                                left: settings.isMuted ? '4px' : '28px',
                                top: '4px',
                                transition: 'left 0.2s'
                            }
                        }))
                    ]),
                    
                    // Music toggle
                    React.createElement('div', { 
                        className: 'flex items-center justify-between',
                        key: 'music'
                    }, [
                        React.createElement('span', { className: 'text-white' }, 'Music'),
                        React.createElement('button', {
                            className: `w-14 h-8 rounded-full relative transition-colors duration-200 ${
                                settings.musicEnabled ? 'bg-purple-600' : 'bg-gray-600'
                            }`,
                            onClick: () => setSettings(prev => ({
                                ...prev,
                                musicEnabled: !prev.musicEnabled
                            }))
                        }, React.createElement('div', {
                            className: 'absolute w-6 h-6 bg-white rounded-full',
                            style: {
                                left: settings.musicEnabled ? '28px' : '4px',
                                top: '4px',
                                transition: 'left 0.2s'
                            }
                        }))
                    ]),
                    
                    // Vibration toggle
                    React.createElement('div', { 
                        className: 'flex items-center justify-between',
                        key: 'vibration'
                    }, [
                        React.createElement('span', { className: 'text-white' }, 'Vibration'),
                        React.createElement('button', {
                            className: `w-14 h-8 rounded-full relative transition-colors duration-200 ${
                                settings.vibrationEnabled ? 'bg-purple-600' : 'bg-gray-600'
                            }`,
                            onClick: () => setSettings(prev => ({
                                ...prev,
                                vibrationEnabled: !prev.vibrationEnabled
                            }))
                        }, React.createElement('div', {
                            className: 'absolute w-6 h-6 bg-white rounded-full',
                            style: {
                                left: settings.vibrationEnabled ? '28px' : '4px',
                                top: '4px',
                                transition: 'left 0.2s'
                            }
                        }))
                    ])
                ]),
                
                React.createElement('button', {
                    className: 'mt-6 w-full py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors',
                    onClick: onClose,
                    key: 'close-btn'
                }, 'Close')
            ])
        );
    };

    // LevelUpModal
    const LevelUpModal = ({ level, onClose }) => {
        return React.createElement('div', {
            className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50',
            onClick: onClose
        },
            React.createElement('div', {
                className: 'bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white text-center shadow-lg transform',
                onClick: e => e.stopPropagation()
            }, [
                React.createElement('h2', { 
                    className: 'text-4xl md:text-6xl font-bold mb-4',
                    key: 'title'
                }, 'Level Up!'),
                React.createElement('p', { 
                    className: 'text-2xl md:text-3xl',
                    key: 'level'
                }, 'Level ' + level)
            ])
        );
    };

    // Store Modal COMPLET avec prix Pi Network
    const StoreModal = ({ show, onClose, coins, onPurchase, onWatchAd, activeTheme, setActiveTheme, activeEffect, setActiveEffect, userInventory }) => {
        if (!show) return null;
        
        return React.createElement('div', {
            className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50',
            onClick: onClose
        },
            React.createElement('div', {
                className: 'bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-6 m-4 max-w-5xl w-full max-h-[85vh] overflow-y-auto store-container',
                onClick: e => e.stopPropagation()
            }, [
                // Header avec balance
                React.createElement('div', {
                    className: 'store-header',
                    key: 'header'
                }, [
                    React.createElement('h2', { className: 'text-3xl font-bold text-white' }, 'Pi Network Store'),
                    React.createElement('div', { className: 'flex items-center gap-4' }, [
                        React.createElement('div', { 
                            className: 'flex items-center bg-black/30 rounded-xl px-4 py-2 border border-yellow-400/50' 
                        }, [
                            React.createElement('i', { className: 'fas fa-coins text-yellow-300 mr-2 text-xl' }),
                            React.createElement('span', { className: 'text-white font-bold text-xl' }, coins.toLocaleString())
                        ]),
                        React.createElement('button', {
                            className: 'store-close-button',
                            onClick: onClose,
                            'aria-label': 'Close Store'
                        }, React.createElement('i', { className: 'fas fa-times' }))
                    ])
                ]),
                
                // COIN PACKS SECTION - Pi Network
                React.createElement('div', { className: 'mb-8', key: 'coin-packs-section' }, [
                    React.createElement('h3', { className: 'text-2xl text-white font-bold mb-4 flex items-center' }, [
                        React.createElement('i', { className: 'fas fa-coins text-yellow-300 mr-3' }),
                        'Coin Packs - Pay with Pi (π)'
                    ]),
                    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4' },
                        Object.entries(STORE_ITEMS.coinPacks).map(([key, pack]) => {
                            const isStarterPack = pack.type === 'ad';
                            const isPiPack = pack.type === 'pi';
                            const totalCoins = pack.coins + pack.bonus;
                            
                            return React.createElement('button', {
                                key,
                                className: `${
                                    isStarterPack 
                                        ? 'bg-green-600/60 border-2 border-green-400 hover:bg-green-600/80'
                                        : isPiPack
                                            ? 'bg-gradient-to-b from-orange-500/40 to-yellow-500/40 border-2 border-orange-400/60 hover:from-orange-500/60 hover:to-yellow-500/60'
                                            : 'bg-gradient-to-b from-yellow-500/40 to-orange-500/40 border-2 border-yellow-400/60 hover:from-yellow-500/60 hover:to-orange-500/60'
                                } rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 shadow-lg`,
                                onClick: () => {
                                    if (isStarterPack) {
                                        onWatchAd(pack);
                                    } else {
                                        onPurchase('coinPack', key);
                                    }
                                }
                            }, [
                                React.createElement('div', { className: 'text-center mb-3', key: 'icon' }, 
                                    React.createElement('i', { 
                                        className: `${pack.icon} text-3xl ${
                                            isStarterPack ? 'text-green-300' : 
                                            isPiPack ? 'text-orange-300' : 'text-yellow-300'
                                        }` 
                                    })
                                ),
                                
                                React.createElement('div', { className: 'text-lg font-bold mb-2', key: 'name' }, pack.name),
                                
                                React.createElement('div', { className: 'text-2xl font-bold text-yellow-300 mb-2', key: 'coins' }, [
                                    React.createElement('i', { className: 'fas fa-coins mr-1' }),
                                    totalCoins.toLocaleString()
                                ]),
                                
                                pack.bonus > 0 && React.createElement('div', { 
                                    className: 'text-sm text-green-300 font-semibold mb-2',
                                    key: 'bonus'
                                }, `+${pack.bonus} Bonus!`),
                                
                                React.createElement('div', { className: 'text-xs text-white/80 mb-3', key: 'description' }, pack.description),
                                
                                React.createElement('div', { 
                                    className: `text-lg font-bold ${
                                        isStarterPack ? 'text-green-300' : 
                                        isPiPack ? 'text-orange-300' : 'text-white'
                                    }`,
                                    key: 'price'
                                }, [
                                    isStarterPack ? 'Watch Ad' : 
                                    isPiPack ? [
                                        React.createElement('span', { className: 'text-orange-300', key: 'pi-symbol' }, 'π '),
                                        pack.price.toFixed(1)
                                    ] : `π ${pack.price.toFixed(1)}`
                                ])
                            ]);
                        })
                    )
                ]),
                
                // THEMES SECTION - Pi Network
                React.createElement('div', { className: 'mb-8', key: 'themes-section' }, [
                    React.createElement('h3', { className: 'text-2xl text-white font-bold mb-4 flex items-center' }, [
                        React.createElement('i', { className: 'fas fa-palette text-purple-300 mr-3' }),
                        'Color Themes - Pay with Pi (π)'
                    ]),
                    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4' },
                        Object.entries(STORE_ITEMS.themes).map(([key, theme]) => {
                            const isUnlocked = userInventory.themes.includes(key);
                            const isActive = activeTheme === key;
                            const isFree = theme.type === 'free';
                            
                            return React.createElement('button', {
                                key,
                                className: `${
                                    isUnlocked 
                                        ? isActive 
                                            ? 'bg-green-600/70 ring-4 ring-green-400 shadow-lg shadow-green-400/40'
                                            : 'bg-green-500/40 hover:bg-green-500/60' 
                                        : isFree
                                            ? 'bg-blue-500/40 hover:bg-blue-500/60'
                                            : 'bg-orange-500/40 hover:bg-orange-500/60 border-2 border-dashed border-orange-400/60'
                                } rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105`,
                                onClick: () => {
                                    if (isUnlocked) {
                                        setActiveTheme(key);
                                        window.addNotification(`${theme.name} theme activated!`, 'success');
                                    } else if (isFree) {
                                        setActiveTheme(key);
                                        // Automatically unlock free themes
                                        setUserInventory(prev => ({
                                            ...prev,
                                            themes: [...prev.themes, key]
                                        }));
                                        window.addNotification(`${theme.name} theme activated!`, 'success');
                                    } else {
                                        onPurchase('theme', key);
                                    }
                                }
                            }, [
                                React.createElement('div', { className: 'text-lg font-bold mb-2', key: 'name' }, [
                                    React.createElement('i', { className: `${theme.icon} mr-2` }),
                                    theme.name
                                ]),
                                
                                // Theme preview colors
                                theme.colors && React.createElement('div', { 
                                    className: 'flex justify-center gap-1 mb-3',
                                    key: 'preview'
                                }, theme.colors.slice(0, 4).map((color, idx) => 
                                    React.createElement('div', {
                                        key: idx,
                                        className: 'w-6 h-6 rounded-full border-2 border-white/40',
                                        style: { backgroundColor: color.value }
                                    })
                                )),
                                
                                React.createElement('div', { 
                                    className: 'text-xs text-white/80 mb-3',
                                    key: 'description'
                                }, theme.description),
                                
                                !isUnlocked ? 
                                    React.createElement('div', { className: 'flex items-center justify-center text-lg font-bold', key: 'price' }, [
                                        isFree ? 'FREE' : [
                                            React.createElement('span', { className: 'text-orange-300 mr-1', key: 'pi-symbol' }, 'π'),
                                            theme.price.toFixed(1)
                                        ]
                                    ]) : 
                                    React.createElement('div', { className: isActive ? 'text-green-300 font-bold' : 'text-white/70', key: 'status' }, [
                                        React.createElement('i', { className: isActive ? 'fas fa-check mr-2' : 'fas fa-palette mr-2' }),
                                        isActive ? 'ACTIVE' : 'Select'
                                    ])
                            ]);
                        })
                    )
                ]),
                
                // EFFECTS SECTION - Pi Network
                React.createElement('div', { className: 'mb-4', key: 'effects-section' }, [
                    React.createElement('h3', { className: 'text-2xl text-white font-bold mb-4 flex items-center' }, [
                        React.createElement('i', { className: 'fas fa-magic text-pink-300 mr-3' }),
                        'Visual Effects - Pay with Pi (π)'
                    ]),
                    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
                        Object.entries(STORE_ITEMS.effects).map(([key, effect]) => {
                            const isUnlocked = userInventory.effects.includes(key);
                            const isActive = activeEffect === key;
                            const isFree = effect.type === 'free';
                            
                            return React.createElement('button', {
                                key,
                                className: `${
                                    isUnlocked 
                                        ? isActive 
                                            ? 'bg-green-600/70 ring-4 ring-green-400 shadow-lg shadow-green-400/40'
                                            : 'bg-green-500/40 hover:bg-green-500/60' 
                                        : isFree
                                            ? 'bg-blue-500/40 hover:bg-blue-500/60'
                                            : 'bg-orange-500/40 hover:bg-orange-500/60 border-2 border-dashed border-orange-400/60'
                                } rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105`,
                                onClick: () => {
                                    if (isUnlocked) {
                                        setActiveEffect(key);
                                        window.addNotification(`${effect.name} effect activated!`, 'success');
                                    } else if (isFree) {
                                        setActiveEffect(key);
                                        // Automatically unlock free effects
                                        setUserInventory(prev => ({
                                            ...prev,
                                            effects: [...prev.effects, key]
                                        }));
                                        window.addNotification(`${effect.name} effect activated!`, 'success');
                                    } else {
                                        onPurchase('effect', key);
                                    }
                                }
                            }, [
                                React.createElement('div', { className: 'text-lg font-bold mb-2', key: 'name' }, [
                                    React.createElement('i', { className: `${effect.icon} mr-2` }),
                                    effect.name
                                ]),
                                
                                React.createElement('div', { 
                                    className: 'text-xs text-white/80 mb-3',
                                    key: 'description'
                                }, effect.description),
                                
                                !isUnlocked ? 
                                    React.createElement('div', { className: 'flex items-center justify-center text-lg font-bold', key: 'price' }, [
                                        isFree ? 'FREE' : [
                                            React.createElement('span', { className: 'text-orange-300 mr-1', key: 'pi-symbol' }, 'π'),
                                            effect.price.toFixed(1)
                                        ]
                                    ]) : 
                                    React.createElement('div', { className: isActive ? 'text-green-300 font-bold' : 'text-white/70', key: 'status' }, [
                                        React.createElement('i', { className: isActive ? 'fas fa-check mr-2' : 'fas fa-star mr-2' }),
                                        isActive ? 'ACTIVE' : 'Select'
                                    ])
                            ]);
                        })
                    )
                ])
            ])
        );
    };

    // GameOverModal
    const GameOverModal = ({ show, score, level, coins, onClose, onRestart, onHome, onShare }) => {
        if (!show) return null;
        
        return React.createElement('div', {
            className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50',
            onClick: onClose
        },
            React.createElement('div', {
                className: 'bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-center shadow-xl m-4 max-w-sm w-full',
                onClick: e => e.stopPropagation()
            }, [
                React.createElement('h2', { 
                    className: 'text-3xl md:text-4xl font-bold text-white mb-4',
                    key: 'title'
                }, 'Game Over!'),
                
                React.createElement('div', { 
                    className: 'space-y-3 mb-6',
                    key: 'stats'
                }, [
                    React.createElement('p', { className: 'text-xl text-white/90', key: 'score' }, 'Score: ' + score.toLocaleString()),
                    React.createElement('p', { className: 'text-xl text-white/90', key: 'level' }, 'Level: ' + level),
                    React.createElement('div', { 
                        className: 'flex items-center justify-center text-xl text-yellow-300',
                        key: 'coins'
                    }, [
                        React.createElement('i', { className: 'fas fa-coins mr-2' }),
                        coins.toLocaleString()
                    ])
                ]),
                
                React.createElement('div', { 
                    className: 'space-y-3',
                    key: 'buttons'
                }, [
                    // Share button
                    React.createElement('button', {
                        className: 'w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-bold transition-colors',
                        key: 'share',
                        onClick: () => onShare(score, level)
                    }, [
                        React.createElement('i', { className: 'fas fa-share-alt mr-2' }),
                        'Share Score'
                    ]),
                    
                    // Restart button
                    React.createElement('button', {
                        className: 'w-full py-3 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition-colors',
                        key: 'restart',
                        onClick: onRestart
                    }, [
                        React.createElement('i', { className: 'fas fa-redo mr-2' }),
                        'Play Again'
                    ]),
                    
                    // Home button
                    React.createElement('button', {
                        className: 'w-full py-3 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-bold transition-colors',
                        key: 'home',
                        onClick: onHome
                    }, [
                        React.createElement('i', { className: 'fas fa-home mr-2' }),
                        'Main Menu'
                    ])
                ])
            ])
        );
    };

    // GameScreen avec timer réparé
    const GameScreen = () => {
        const { 
            score, level, combo, points, selectedPoint, gameTime, currentDifficulty,
            activePowerups, powerupCooldowns, scoreAnimations, coinAnimations, handlePointClick,
            handlePowerup, calculateLevelUpThreshold, activeEffect, coins, levelDescription,
            isTimerActive, userPiBalance
        } = useContext(AppContext);
        
        return React.createElement('div', {
            className: 'h-screen w-full relative overflow-hidden game-screen-container',
            style: {
                background: activeEffect === 'trail' ? 
                    'radial-gradient(circle at center, #1a1a2e 0%, #16213e 100%)' :
                    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
            }
        }, [
            // Score Panel avec timer réparé
            React.createElement('div', {
                className: 'fixed top-4 left-4 bg-black/40 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/10 z-20',
                key: 'score-panel'
            }, [
                React.createElement('div', {
                    className: 'flex justify-between gap-8 text-white text-center min-w-[350px]',
                    key: 'stats'
                }, [
                    // Score
                    React.createElement('div', { key: 'score' }, [
                        React.createElement('div', {
                            className: 'text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500',
                            style: { 
                                textShadow: activePowerups.includes('doublePoints') ? '0 0 20px #ffdd00' : 'none'
                            }
                        }, score.toLocaleString()),
                        React.createElement('div', { className: 'text-sm opacity-80' }, 'Score')
                    ]),
                    
                    // Level
                    React.createElement('div', { key: 'level' }, [
                        React.createElement('div', { className: 'text-3xl md:text-4xl font-bold text-purple-400' }, level),
                        React.createElement('div', { className: 'text-sm opacity-80' }, 'Level')
                    ]),
                    
                    // Combo
                    React.createElement('div', { key: 'combo' }, [
                        React.createElement('div', { 
                            className: 'text-3xl md:text-4xl font-bold text-pink-500',
                            style: {
                                filter: combo > 5 ? 'drop-shadow(0 0 10px #ec4899)' : 'none'
                            }
                        }, 'x' + combo),
                        React.createElement('div', { className: 'text-sm opacity-80' }, 'Combo')
                    ])
                ]),
                
                React.createElement('div', {
                    className: 'mt-2 flex justify-between items-center',
                    key: 'difficulty'
                }, [
                    React.createElement('div', {
                        className: `text-sm px-3 py-1 rounded-full font-bold ${DIFFICULTIES[currentDifficulty].color}`
                    }, DIFFICULTIES[currentDifficulty].label),
                    
                    // Timer réparé avec indicateur d'activité
                    React.createElement(TimerDisplay, {
                        gameTime: gameTime,
                        isActive: isTimerActive
                    })
                ]),
                
                React.createElement('div', {
                    className: 'mt-4 w-full h-3 bg-black/30 rounded-full overflow-hidden border border-white/20',
                    key: 'progress'
                }, 
                    React.createElement('div', {
                        className: 'h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-300',
                        style: {
                            width: Math.min(100, (score / calculateLevelUpThreshold() * 100)) + '%',
                            boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)'
                        }
                    })
                )
            ]),
            
            // Game points avec effets améliorés
            ...points.map(point => {
                let pointClass = `absolute w-8 h-8 md:w-10 md:h-10 rounded-full transform -translate-x-1/2 -translate-y-1/2 touch-none select-none cursor-pointer point transition-all duration-200 ${point === selectedPoint ? 'ring-4 ring-white shadow-lg scale-110' : ''} ${point.isSpecial ? 'animate-pulse' : ''}`;
                
                let pointStyle = {
                    backgroundColor: point.color.value,
                    left: point.x,
                    top: point.y,
                    zIndex: point.zIndex || 100
                };

                // Effets selon le thème actif
                switch (activeEffect) {
                    case 'sparkle':
                        pointStyle.boxShadow = `0 0 25px ${point.color.value}, 0 0 50px ${point.color.value}80`;
                        if (point.isSpecial) {
                            pointClass += ' animate-bounce';
                        }
                        break;
                    case 'trail':
                        pointStyle.boxShadow = `0 0 30px ${point.color.value}, 0 0 60px ${point.color.value}60, inset 0 0 15px rgba(255,255,255,0.4)`;
                        break;
                    case 'explosion':
                        pointStyle.boxShadow = `0 0 20px ${point.color.value}${point.isSpecial ? 'FF' : '80'}`;
                        if (point.isSpecial) {
                            pointClass += ' animate-bounce';
                        }
                        break;
                    default:
                        pointStyle.boxShadow = `0 0 15px ${point.color.value}${point.isSpecial ? '80' : '40'}`;
                }

                if (activePowerups.includes('magnet')) {
                    pointClass += ' magnetized-point';
                }

                return React.createElement('div', {
                    key: point.id,
                    className: pointClass,
                    style: pointStyle,
                    onClick: () => handlePointClick(point)
                });
            }),
            
            // Connection line
            selectedPoint && React.createElement('svg', {
                className: 'absolute inset-0 pointer-events-none z-10',
                key: 'connection-line'
            }, 
                React.createElement('line', {
                    x1: selectedPoint.x,
                    y1: selectedPoint.y,
                    x2: selectedPoint.x,
                    y2: selectedPoint.y,
                    stroke: selectedPoint.color.value,
                    strokeWidth: activeEffect === 'trail' ? '6' : '4',
                    strokeLinecap: 'round',
                    style: {
                        filter: `drop-shadow(0 0 ${activeEffect === 'trail' ? '10' : '6'}px ${selectedPoint.color.value})`
                    },
                    className: `${activePowerups.includes('doublePoints') ? 'doublepoints-line' : ''}`
                })
            ),
            
            // PowerUps avec design amélioré et prix Pi
            React.createElement('div', {
                className: 'fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-30',
                key: 'powerups'
            }, 
                Object.entries(POWERUPS).map(([type, powerup]) => 
                    React.createElement(PowerupButton, {
                        key: type,
                        type,
                        powerup,
                        isActive: activePowerups.includes(type),
                        onCooldown: powerupCooldowns[type],
                        onClick: () => handlePowerup(type),
                        userPiBalance: userPiBalance
                    })
                )
            ),
            
            // Description du niveau (IA)
            levelDescription && React.createElement(LevelDescription, {
                key: 'level-description',
                description: levelDescription,
                level: level
            }),
            
            // Effets spéciaux actifs
            activePowerups.includes('timeSlow') && React.createElement('div', {
                key: 'time-freeze',
                className: 'time-freeze-effect'
            }),
            
            activePowerups.includes('doublePoints') && React.createElement('div', {
                key: 'points-multiplier',
                className: 'points-multiplier-effect',
                style: { opacity: 1 }
            }, '3X POINTS!'),
            
            // Score animations
            scoreAnimations.map(animation => 
                React.createElement(ScorePopup, {
                    key: animation.id,
                    points: animation.points,
                    x: animation.x,
                    y: animation.y
                })
            ),
            
            // Coin animations
            coinAnimations && coinAnimations.map(animation => 
                React.createElement(CoinAnimation, {
                    key: animation.id,
                    coins: animation.coins,
                    x: animation.x,
                    y: animation.y
                })
            )
        ]);
    };

    // PowerupButton amélioré avec prix Pi
    const PowerupButton = ({ type, powerup, isActive, onCooldown, onClick, userPiBalance }) => {
        const canAfford = userPiBalance >= powerup.price;
        
        return React.createElement('button', {
            className: `w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center touch-none select-none backdrop-blur-md shadow-lg powerup-button transition-all duration-200 ${
                onCooldown ? 'bg-gray-800/70 cursor-not-allowed' : 
                canAfford ? 'bg-black/40 hover:bg-black/60 hover:scale-105' : 
                'bg-red-800/60 cursor-not-allowed'
            } ${isActive ? powerup.activeClass + ' ring-4 ring-white/50' : ''} border border-white/20`,
            onClick: onClick,
            disabled: onCooldown || !canAfford,
            title: `${powerup.effect} - Cost: π ${powerup.price.toFixed(3)}`
        }, [
            React.createElement('i', { 
                className: isActive ? powerup.activeIcon : powerup.icon + ' text-xl md:text-2xl',
                key: 'icon'
            }),
            
            isActive && React.createElement('div', {
                className: 'absolute inset-0 rounded-xl bg-white/20 animate-pulse',
                key: 'active-anim'
            }),
            
            onCooldown && React.createElement('div', {
                className: 'absolute inset-0 rounded-xl bg-black/70',
                style: {
                    height: '100%',
                    animation: `cooldown ${powerup.cooldown / 1000}s linear forwards`
                },
                key: 'cooldown'
            }),
            
            !isActive && !onCooldown && React.createElement('div', {
                className: 'powerup-price text-orange-300 text-xs',
                key: 'price'
            }, `π${powerup.price.toFixed(2)}`)
        ]);
    };
    
    // LaunchScreen
    const LaunchScreen = ({ onStart }) => {
        return React.createElement('div', {
            className: 'h-screen w-full bg-gradient-to-b from-gray-900 via-purple-900/50 to-indigo-900/70 flex items-center justify-center flex-col gap-8'
        }, [
            // Logo animation
            React.createElement('div', { 
                className: 'relative w-32 md:w-40 h-32 md:h-40',
                key: 'logo-animation'
            }, [
                ...[0, 1, 2].map(index => 
                    React.createElement('div', {
                        key: 'orbit-' + index,
                        className: 'absolute inset-0 rounded-full border-4 border-purple-500 animate-orbit',
                        style: {
                            animationDelay: index * 0.3 + 's',
                            transformOrigin: 'center',
                            opacity: 0.7 - index * 0.1,
                            borderColor: ['#9333ea', '#ec4899', '#06b6d4'][index]
                        }
                    })
                ),
                
                React.createElement('div', {
                    className: 'absolute inset-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-float',
                    style: {
                        boxShadow: '0 0 30px rgba(168, 85, 247, 0.8), inset 0 0 20px rgba(255,255,255,0.3)'
                    }
                })
            ]),
            
            // Title
            React.createElement('h1', {
                className: 'text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 animate-pulse',
                style: {
                    textShadow: '0 0 30px rgba(255,255,255,0.5)'
                },
                key: 'title'
            }, 'ColorFlow Infinity'),
            
            React.createElement('p', {
                className: 'text-xl md:text-2xl text-white/90 text-center font-semibold',
                key: 'subtitle'
            }, 'By Amega Studio'),
            
            React.createElement('p', {
                className: 'text-lg text-white/70 text-center max-w-md px-4',
                key: 'description'
            }, 'Connect matching colors and pay with Pi Network!'),
            
            // Start button
            React.createElement('button', {
                className: 'px-8 md:px-12 py-4 md:py-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white text-xl md:text-2xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50',
                onClick: onStart,
                key: 'start'
            }, [
                React.createElement('i', { className: 'fas fa-play mr-3' }),
                'Start Game'
            ])
        ]);
    };

    // Main application
    window.ColorFlowApp = function ColorFlowApp() {
        // Game states
        const [gameState, setGameState] = useState('launch');
        const [score, setScore] = useState(0);
        const [level, setLevel] = useState(1);
        const [combo, setCombo] = useState(1);
        const [selectedPoint, setSelectedPoint] = useState(null);
        const [points, setPoints] = useState([]);
        const [gameTime, setGameTime] = useState(20);
        const [isTimerActive, setIsTimerActive] = useState(false);
        const [currentDifficulty, setCurrentDifficulty] = useState('easy');
        const [activePowerups, setActivePowerups] = useState([]);
        const [powerupCooldowns, setPowerupCooldowns] = useState({});
        const [scoreAnimations, setScoreAnimations] = useState([]);
        const [coinAnimations, setCoinAnimations] = useState([]);
        const [pointGenerator] = useState(() => new AdaptivePointGenerator());
        const [continuesUsed, setContinuesUsed] = useState(0);
        const [effectiveConnections, setEffectiveConnections] = useState(0);
        const [isPaused, setIsPaused] = useState(false);
        const [showConfirmHome, setShowConfirmHome] = useState(false);
        const [levelDescription, setLevelDescription] = useState(null);
        const [activeTheme, setActiveTheme] = useState(() => {
            return Storage.get('activeTheme', 'default');
        });
        const [activeEffect, setActiveEffect] = useState(() => {
            return Storage.get('activeEffect', 'default');
        });
        const [userPiBalance, setUserPiBalance] = useState(() => {
            return Storage.get('userPiBalance', 0);
        });

        // UI states
        const [showSettings, setShowSettings] = useState(false);
        const [showStore, setShowStore] = useState(false);
        const [showGameOver, setShowGameOver] = useState(false);
        const [showLevelUp, setShowLevelUp] = useState(false);
        const [settings, setSettings] = useState(() => ({
            ...window.audioSettings
        }));

        // User inventory and coins
        const [userInventory, setUserInventory] = useState(() => {
            return Storage.get('inventory', {
                coins: 1000, // Plus de coins de départ pour faciliter les achats
                themes: ['default'],
                effects: ['default']
            });
        });
        
        const [coins, setCoins] = useState(() => {
            return Storage.get('coins', 100);
        });

        // Timer ref - RÉPARÉ
        const gameTimerRef = useRef(null);

        // Save states
        useEffect(() => {
            Storage.set('activeTheme', activeTheme);
        }, [activeTheme]);

        useEffect(() => {
            Storage.set('activeEffect', activeEffect);
        }, [activeEffect]);

        useEffect(() => {
            window.audioSettings = {...settings};
        }, [settings]);

        useEffect(() => {
            Storage.set('coins', coins);
        }, [coins]);

        useEffect(() => {
            Storage.set('inventory', userInventory);
        }, [userInventory]);

        useEffect(() => {
            Storage.set('userPiBalance', userPiBalance);
        }, [userPiBalance]);

        // Game timer functions - RÉPARÉ
        const startGameTimer = useCallback(() => {
            console.log('Starting game timer...');
            
            if (gameTimerRef.current) {
                clearInterval(gameTimerRef.current);
            }
            
            setIsTimerActive(true);
            
            gameTimerRef.current = setInterval(() => {
                setGameTime(prev => {
                    if (prev <= 0.1) {
                        clearInterval(gameTimerRef.current);
                        setIsTimerActive(false);
                        handleGameOver();
                        return 0;
                    }
                    
                    // Facteur de diminution plus aggressif
                    const difficultyFactor = {
                        'easy': 1.0,
                        'medium': 1.1,
                        'hard': 1.25,
                        'expert': 1.4
                    }[currentDifficulty];
                    
                    const timeDecrease = 1.0 * difficultyFactor;
                    const newTime = prev - timeDecrease;
                    
                    console.log(`Timer: ${newTime.toFixed(1)}s (difficulty: ${currentDifficulty})`);
                    
                    return Math.max(0, newTime);
                });
            }, 1000);
            
            console.log('Timer started successfully');
        }, [currentDifficulty]);

        const stopGameTimer = useCallback(() => {
            console.log('Stopping game timer...');
            if (gameTimerRef.current) {
                clearInterval(gameTimerRef.current);
                gameTimerRef.current = null;
            }
            setIsTimerActive(false);
        }, []);

        // Generate points
        const generatePoints = async () => {
            console.log(`Generating points for level ${level} with theme ${activeTheme} and effect ${activeEffect}`);
            
            const newPoints = await pointGenerator.generateAdaptivePoints(
                level, 
                currentDifficulty,
                activeTheme,
                activeEffect
            );
            
            const description = pointGenerator.getCurrentLevelDescription();
            if (description) {
                setLevelDescription(description);
                setTimeout(() => {
                    setLevelDescription(null);
                }, 6000);
            }
            
            setPoints(newPoints);
            console.log(`Generated ${newPoints.length} points`);
        };

        // Handle point click
        const handlePointClick = useCallback((point) => {
            if (isPaused || !isTimerActive) return;
            
            playSound('click');
            
            if (settings.vibrationEnabled && navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            if (!selectedPoint) {
                setSelectedPoint(point);
                return;
            }
            
            if (selectedPoint.id === point.id) {
                setSelectedPoint(null);
                return;
            }
            
            const canConnect = selectedPoint.color.name === point.color.name || 
                            activePowerups.includes('colorBomb');
            
            if (canConnect) {
                handleSuccessfulConnection(point);
            } else {
                handleFailedConnection();
            }
            
            setSelectedPoint(null);
        }, [selectedPoint, activePowerups, settings.vibrationEnabled, isPaused, isTimerActive]);

        // Handle successful connection - AMÉLIORÉ
        const handleSuccessfulConnection = (point) => {
            playSound('connect');
            
            const pointsMultiplier = window.pointsMultiplier || 1;
            
            const distance = Math.sqrt(
                Math.pow(point.x - selectedPoint.x, 2) +
                Math.pow(point.y - selectedPoint.y, 2)
            );
            
            const earnedPoints = Math.round(
                DIFFICULTIES[currentDifficulty].basePoints * 
                (1 + distance / 1000) *
                (1 + combo * 0.25) * 
                (point.isSpecial || selectedPoint.isSpecial ? 2.0 : 1) *
                pointsMultiplier
            );
            
            // Time bonus amélioré
            let timeBonus = 0;
            
            if (point.isSpecial && selectedPoint.isSpecial) {
                timeBonus += 2.0;
            } else if (point.isSpecial || selectedPoint.isSpecial) {
                timeBonus += 1.2;
            }
            
            const maxScreenDimension = Math.max(window.innerWidth, window.innerHeight);
            const distanceRatio = distance / maxScreenDimension;
            const distanceBonus = Math.min(1.5, distanceRatio * 2.5);
            
            if (distanceBonus > 0.4) {
                timeBonus += distanceBonus;
            }
            
            // Bonus combo
            if (combo > 5) {
                timeBonus += 0.8;
            } else if (combo > 3) {
                timeBonus += 0.5;
            }
            
            timeBonus = Math.min(3.0, timeBonus);
            
            if (timeBonus > 0) {
                setGameTime(prev => prev + timeBonus);
                console.log(`Time bonus: +${timeBonus.toFixed(1)}s`);
            }
            
            addScoreAnimation(earnedPoints, point.x, point.y);
            setScore(prev => {
                const newScore = prev + earnedPoints;
                if (newScore >= calculateLevelUpThreshold()) {
                    handleLevelUp();
                }
                return newScore;
            });
            
            setCombo(prev => prev + 1);
            
            let newPoints = points.filter(p => 
                p.id !== point.id && p.id !== selectedPoint.id
            );
            
            setPoints(newPoints);
            
            if (newPoints.length < 6) {
                setTimeout(() => generatePoints(), 200);
            }
            
            // Coin earning généreux
            setEffectiveConnections(prev => prev + 1);
            if (effectiveConnections % 2 === 0) { // Tous les 2 connections
                const baseCoins = 4;
                const specialBonus = (point.isSpecial || selectedPoint.isSpecial) ? 2 : 0;
                const comboBonus = combo > 5 ? 2 : combo > 3 ? 1 : 0;
                const coinsToAdd = baseCoins + specialBonus + comboBonus;
                
                setCoins(prev => prev + coinsToAdd);
                setUserInventory(prev => ({
                    ...prev,
                    coins: prev.coins + coinsToAdd
                }));
                
                addCoinAnimation(coinsToAdd, point.x, point.y);
            }
        };

        // Handle failed connection
        const handleFailedConnection = () => {
            setCombo(1);
            playSound('fail');
        };

        // Handle Pi purchase - NOUVELLE FONCTION
        const handlePiPurchase = async (item, itemId, type) => {
            try {
                if (!window.piPaymentService) {
                    window.addNotification('Pi Network service not available', 'error');
                    return;
                }

                window.addNotification('Initiating Pi payment...', 'info');

                const payment = await window.piPaymentService.createPayment(
                    item.price, // Montant en Pi
                    `ColorFlow Infinity - ${item.name}`, // Memo
                    {
                        type: type,
                        itemId: itemId,
                        coins: item.coins || 0,
                        bonus: item.bonus || 0,
                        gameData: {
                            level: level,
                            score: score
                        }
                    }
                );

                console.log('Pi payment created:', payment);
                window.addNotification('Pi payment created! Please complete in Pi Browser.', 'success');
                
                return payment;
                
            } catch (error) {
                console.error('Pi payment error:', error);
                window.addNotification('Pi payment failed: ' + error.message, 'error');
            }
        };

        // Handle powerup activation avec Pi - MODIFIÉ
        const handlePowerup = async (type) => {
            if (isPaused || powerupCooldowns[type] || activePowerups.includes(type)) return;
            
            const powerupPrice = POWERUPS[type].price;
            
            if (userPiBalance < powerupPrice) {
                playSound('fail');
                window.addNotification(`Need π ${(powerupPrice - userPiBalance).toFixed(3)} more Pi for ${type}!`, 'error');
                return;
            }
            
            try {
                // Créer paiement Pi pour le powerup
                if (window.piPaymentService) {
                    const payment = await window.piPaymentService.createPayment(
                        powerupPrice,
                        `ColorFlow Infinity - ${type} Powerup`,
                        {
                            type: 'powerup',
                            powerupType: type,
                            gameData: {
                                level: level,
                                score: score
                            }
                        }
                    );
                    
                    console.log('Powerup Pi payment created:', payment);
                    window.addNotification(`${type} activated with Pi payment!`, 'success');
                } else {
                    // Fallback: déduire du solde local
                    setUserPiBalance(prev => Math.max(0, prev - powerupPrice));
                    window.addNotification(`${type} activated for π ${powerupPrice.toFixed(3)}!`, 'success');
                }
                
                // Activer le powerup
                setActivePowerups(prev => [...prev, type]);
                
                playSound('powerup');
                if (settings.vibrationEnabled && navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
                
                // Apply powerup effects - CORRIGÉ
                switch (type) {
                    case 'timeSlow':
                        stopGameTimer();
                        
                        setTimeout(() => {
                            setActivePowerups(prev => prev.filter(p => p !== type));
                            setPowerupCooldowns(prev => ({ ...prev, [type]: true }));
                            
                            if (!isPaused && gameState === 'game') {
                                startGameTimer();
                            }
                            
                            setTimeout(() => {
                                setPowerupCooldowns(prev => ({ ...prev, [type]: false }));
                            }, POWERUPS[type].cooldown);
                        }, POWERUPS[type].duration);
                        break;
                        
                    case 'magnet':
                        const centerX = window.innerWidth / 2;
                        const centerY = window.innerHeight / 2;
                        
                        setPoints(prev => prev.map(p => {
                            const dx = centerX - p.x;
                            const dy = centerY - p.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const attraction = 0.6 + (dist / 2000);
                            
                            return {
                                ...p,
                                x: p.x + dx * attraction,
                                y: p.y + dy * attraction,
                                magnetized: true
                            };
                        }));
                        
                        setTimeout(() => {
                            setActivePowerups(prev => prev.filter(p => p !== type));
                            setPowerupCooldowns(prev => ({ ...prev, [type]: true }));
                            
                            setTimeout(() => {
                                setPowerupCooldowns(prev => ({ ...prev, [type]: false }));
                            }, POWERUPS[type].cooldown);
                        }, POWERUPS[type].duration);
                        break;
                        
                    case 'colorBomb':
                        setPoints(prev => {
                            const pointsToRemove = [];
                            const pointsToKeep = [];
                            
                            const shuffledPoints = [...prev].sort(() => Math.random() - 0.5);
                            const removeCount = Math.floor(prev.length / 3);
                            
                            shuffledPoints.forEach((point, index) => {
                                if (index < removeCount) {
                                    pointsToRemove.push(point);
                                } else {
                                    pointsToKeep.push(point);
                                }
                            });
                            
                            const earnedPoints = pointsToRemove.reduce((total, point) => {
                                return total + (point.isSpecial ? 100 : 50);
                            }, 0);
                            
                            pointsToRemove.forEach(point => {
                                addScoreAnimation(point.isSpecial ? 100 : 50, point.x, point.y);
                            });
                            
                            setScore(prev => prev + earnedPoints);
                            
                            if (pointsToKeep.length < 6) {
                                setTimeout(() => generatePoints(), 500);
                            }
                            
                            return pointsToKeep;
                        });
                        
                        setTimeout(() => {
                            setActivePowerups(prev => prev.filter(p => p !== type));
                            setPowerupCooldowns(prev => ({ ...prev, [type]: true }));
                            
                            setTimeout(() => {
                                setPowerupCooldowns(prev => ({ ...prev, [type]: false }));
                            }, POWERUPS[type].cooldown);
                        }, POWERUPS[type].duration);
                        break;
                        
                    case 'doublePoints':
                        window.pointsMultiplier = 3;
                        
                        setTimeout(() => {
                            window.pointsMultiplier = 1;
                            setActivePowerups(prev => prev.filter(p => p !== type));
                            setPowerupCooldowns(prev => ({ ...prev, [type]: true }));
                            
                            setTimeout(() => {
                                setPowerupCooldowns(prev => ({ ...prev, [type]: false }));
                            }, POWERUPS[type].cooldown);
                        }, POWERUPS[type].duration);
                        break;
                }
                
            } catch (error) {
                console.error('Powerup activation error:', error);
                window.addNotification('Powerup activation failed: ' + error.message, 'error');
            }
        };

        // Handle level up
        const handleLevelUp = () => {
            const newLevel = level + 1;
            setLevel(newLevel);
            setShowLevelUp(true);
            playSound('levelUp');
            
            const levelTimeBonus = 5 + (newLevel * 0.5);
            const newTimeLimit = DIFFICULTIES[currentDifficulty].timeLimit + levelTimeBonus;
            
            setGameTime(newTimeLimit);
            window.addNotification(`LEVEL ${newLevel}! +${Math.round(levelTimeBonus)}s`, 'success');
            
            setTimeout(() => setShowLevelUp(false), 2500);
            
            const levelUpCoins = Math.min(50, 15 + Math.floor(newLevel * 2));
            
            setCoins(prev => prev + levelUpCoins);
            setUserInventory(prev => ({
                ...prev,
                coins: prev.coins + levelUpCoins
            }));
            
            window.addNotification(`+${levelUpCoins.toLocaleString()} coins earned!`, 'success');
            
            // Régénérer les points
            setTimeout(() => {
                setPoints([]);
                generatePoints();
            }, 1000);
        };

        // Handle game over
        const handleGameOver = () => {
            console.log('Game over triggered');
            stopGameTimer();
            
            const baseCoins = Math.min(100, level * 8);
            const scoreBonus = score >= 2000 ? 25 : score >= 1000 ? 15 : score >= 500 ? 10 : 0;
            const comboBonus = combo > 15 ? 15 : combo > 10 ? 10 : combo > 5 ? 5 : 0;
            const earnedCoins = Math.min(150, Math.max(10, baseCoins + scoreBonus + comboBonus));
            
            setCoins(prev => prev + earnedCoins);
            setUserInventory(prev => ({
                ...prev,
                coins: prev.coins + earnedCoins
            }));
            
            playSound('fail');
            setShowGameOver(true);
            
            const highScore = Storage.get('highScore', 0);
            if (score > highScore) {
                Storage.set('highScore', score);
                window.addNotification('NEW HIGH SCORE!', 'success');
            }
            
            window.addNotification(`Game Over! +${earnedCoins.toLocaleString()} coins`, 'info');
        };

        // Handle store purchases - MODIFIÉ pour Pi Network
        const handlePurchase = async (type, itemId) => {
            try {
                console.log(`Attempting to purchase ${type}: ${itemId}`);
                
                let item = null;
                
                switch (type) {
                    case 'coinPack':
                        item = STORE_ITEMS.coinPacks[itemId];
                        if (item.type === 'pi') {
                            return await handlePiPurchase(item, itemId, 'coins');
                        } else if (item.type === 'ad') {
                            return handleWatchAd(item);
                        }
                        break;
                        
                    case 'theme':
                        item = STORE_ITEMS.themes[itemId];
                        if (item.type === 'pi') {
                            return await handlePiPurchase(item, itemId, 'theme');
                        } else if (item.type === 'free') {
                            // Déverrouiller gratuitement
                            setUserInventory(prev => ({
                                ...prev,
                                themes: [...prev.themes, itemId]
                            }));
                            setActiveTheme(itemId);
                            window.addNotification(`${item.name} theme unlocked!`, 'success');
                            return;
                        }
                        break;
                        
                    case 'effect':
                        item = STORE_ITEMS.effects[itemId];
                        if (item.type === 'pi') {
                            return await handlePiPurchase(item, itemId, 'effect');
                        } else if (item.type === 'free') {
                            // Déverrouiller gratuitement
                            setUserInventory(prev => ({
                                ...prev,
                                effects: [...prev.effects, itemId]
                            }));
                            setActiveEffect(itemId);
                            window.addNotification(`${item.name} effect unlocked!`, 'success');
                            return;
                        }
                        break;
                        
                    default:
                        window.addNotification('Invalid purchase type!', 'error');
                        return;
                }
                
            } catch (error) {
                console.error('Purchase error:', error);
                window.addNotification('Purchase failed. Please try again.', 'error');
            }
        };

        // Handle watch ad - NOUVEAU
        const handleWatchAd = (pack) => {
            console.log('Watching ad for:', pack);
            
            // Simulation de publicité
            window.addNotification('Watching ad...', 'info');
            
            setTimeout(() => {
                const totalCoins = pack.coins + pack.bonus;
                
                setCoins(prev => prev + totalCoins);
                setUserInventory(prev => ({
                    ...prev,
                    coins: prev.coins + totalCoins
                }));
                
                playSound('achievement');
                window.addNotification(`+${totalCoins.toLocaleString()} coins from ad!`, 'success');
            }, 2000);
        };

        // Handle share score
        const handleShareScore = async (score, level) => {
            try {
                const shareData = {
                    title: 'ColorFlow Infinity - By AmeGameStudio',
                    text: `🎮 I just scored ${score.toLocaleString()} points and reached level ${level} in ColorFlow Infinity! 🎯\n\nCan you beat my score? 🏆`,
                    url: window.location.href
                };
                
                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    window.addNotification('Score shared successfully!', 'success');
                } else {
                    const text = `${shareData.text}\n\nPlay now: ${shareData.url}`;
                    await navigator.clipboard.writeText(text);
                    window.addNotification('Score copied to clipboard!', 'success');
                }
                
                playSound('achievement');
                
            } catch (error) {
                console.error('Share error:', error);
                try {
                    const fallbackText = `I scored ${score.toLocaleString()} points in ColorFlow Infinity! Can you beat it?`;
                    await navigator.clipboard.writeText(fallbackText);
                    window.addNotification('Score text copied!', 'success');
                } catch (clipboardError) {
                    window.addNotification('Share feature not available, but great score!', 'info');
                }
            }
        };

        // Handle opening store - AVEC PAUSE
        const handleOpenStore = () => {
            console.log('Opening store, pausing game...');
            setIsPaused(true);
            stopGameTimer();
            setShowStore(true);
            window.addNotification('Game paused while shopping', 'info');
        };

        // Handle closing store - AVEC REPRISE
        const handleCloseStore = () => {
            console.log('Closing store, resuming game...');
            setShowStore(false);
            setIsPaused(false);
            
            if (gameState === 'game' && gameTime > 0) {
                startGameTimer();
                window.addNotification('Game resumed!', 'success');
            }
        };

        // Game state management
        useEffect(() => {
            if (gameState === 'game') {
                resetGame();
                setTimeout(() => {
                    generatePoints();
                    setTimeout(() => {
                        startGameTimer();
                    }, 500);
                }, 200);
                
                if (settings.musicEnabled && !settings.isMuted) {
                    playBackgroundMusic();
                }
                
                return () => {
                    stopGameTimer();
                    stopBackgroundMusic();
                };
            }
        }, [gameState, startGameTimer]);

        // Reset game
        const resetGame = () => {
            console.log('Resetting game...');
            stopGameTimer();
            
            setScore(0);
            setLevel(1);
            setCombo(1);
            setSelectedPoint(null);
            setCurrentDifficulty('easy');
            setGameTime(DIFFICULTIES.easy.timeLimit);
            setActivePowerups([]);
            setPowerupCooldowns({});
            setShowGameOver(false);
            setContinuesUsed(0);
            setEffectiveConnections(0);
            setIsPaused(false);
            setPoints([]);
            setLevelDescription(null);
            setScoreAnimations([]);
            setCoinAnimations([]);
            
            window.pointsMultiplier = 1;
        };

        // Restart game
        const handleGameRestart = () => {
            setShowGameOver(false);
            resetGame();
            playSound('click');
            
            setTimeout(() => {
                generatePoints();
                setTimeout(() => {
                    startGameTimer();
                }, 500);
            }, 300);
        };

        // Level up threshold
        const calculateLevelUpThreshold = () => {
            return level * 800 + Math.pow(level, 2) * 400;
        };

        // Add score animation
        const addScoreAnimation = (points, x, y) => {
            const id = Date.now() + Math.random();
            setScoreAnimations(prev => [...prev, { id, points, x, y }]);
            setTimeout(() => {
                setScoreAnimations(prev => prev.filter(anim => anim.id !== id));
            }, 1000);
        };

        // Add coin animation
        const addCoinAnimation = (coins, x, y) => {
            const id = Date.now() + Math.random();
            setCoinAnimations(prev => [...prev, { id, coins, x, y }]);
            setTimeout(() => {
                setCoinAnimations(prev => prev.filter(anim => anim.id !== id));
            }, 1000);
        };

        // Context value
        const contextValue = {
            score,
            level,
            combo,
            points,
            selectedPoint,
            gameTime,
            isTimerActive,
            currentDifficulty,
            activePowerups,
            powerupCooldowns,
            scoreAnimations,
            coinAnimations,
            settings,
            userInventory,
            coins,
            continuesUsed,
            activeTheme,
            activeEffect,
            levelDescription,
            userPiBalance,
            
            handlePointClick,
            handlePowerup,
            calculateLevelUpThreshold
        };

        // Expose functions to window
        window.setUserInventory = setUserInventory;
        window.setCoins = setCoins;
        window.setIsPaused = setIsPaused;
        window.startGameTimer = startGameTimer;
        window.generatePoints = generatePoints;
        window.setGameState = setGameState;
        window.resetGame = resetGame;
        window.handleGameRestart = handleGameRestart;
        window.setUserPiBalance = setUserPiBalance;

        // Test Pi transaction function
        window.testPiTransaction = async function() {
            try {
                console.log('Testing Pi Network transaction...');
                
                if (!window.piPaymentService) {
                    console.error('Pi Payment Service not available');
                    return { success: false, error: 'Pi service not initialized' };
                }

                // Test avec le pack small
                const testItem = STORE_ITEMS.coinPacks.small;
                
                const payment = await window.piPaymentService.createPayment(
                    0.1, // Test avec 0.1 Pi
                    'ColorFlow Infinity - Test Transaction',
                    {
                        type: 'test',
                        itemId: 'test_transaction',
                        coins: 100,
                        testMode: true
                    }
                );

                console.log('Test Pi payment created successfully:', payment);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification('Test Pi transaction initiated! Check Pi Browser.', 'success');
                }
                
                return { success: true, payment: payment };
                
            } catch (error) {
                console.error('Test Pi transaction failed:', error);
                
                if (typeof window.addNotification === 'function') {
                    window.addNotification('Test transaction failed: ' + error.message, 'error');
                }
                
                return { success: false, error: error.message };
            }
        };

        // Cleanup timer on unmount
        useEffect(() => {
            return () => {
                if (gameTimerRef.current) {
                    clearInterval(gameTimerRef.current);
                }
            };
        }, []);

        // Render based on game state
        return React.createElement(AppContext.Provider, { value: contextValue }, [
            gameState === 'launch' ? 
                React.createElement(LaunchScreen, {
                    key: 'launch-screen',
                    onStart: () => {
                        playSound('click');
                        setGameState('game');
                    }
                }) : 
                React.createElement(React.Fragment, { key: 'game-screen' }, [
                    // Game UI
                    React.createElement(GameScreen, { key: 'main-game' }),
                    
                    // Home Button
                    React.createElement(HomeButton, {
                        key: 'home-button',
                        onClick: () => {
                            setShowConfirmHome(true);
                            setIsPaused(true);
                            stopGameTimer();
                        }
                    }),
                    
                    // Share Button
                    React.createElement(ShareButton, {
                        key: 'share-button',
                        onClick: handleShareScore,
                        score: score,
                        level: level
                    }),
                    
                    // Confirm modal
                    showConfirmHome && React.createElement(ConfirmModal, {
                        key: 'confirm-home-modal',
                        show: showConfirmHome,
                        message: "Are you sure you want to quit and return to the main menu?",
                        onConfirm: () => {
                            setShowConfirmHome(false);
                            setIsPaused(false);
                            setGameState('launch');
                            resetGame();
                        },
                        onCancel: () => {
                            setShowConfirmHome(false);
                            setIsPaused(false);
                            if (gameState === 'game' && gameTime > 0) {
                                startGameTimer();
                            }
                        }
                    }),
                    
                    // Coins display avec ouverture store + Pi Balance
                    React.createElement('div', {
                        className: 'fixed top-4 right-24 flex flex-col gap-2 z-30',
                        key: 'balance-display'
                    }, [
                        // Coins balance
                        React.createElement('div', {
                            className: 'flex items-center bg-black/50 backdrop-blur-md rounded-xl px-4 py-3 text-white border border-yellow-400/50 shadow-lg cursor-pointer hover:bg-black/60 transition-all duration-200 transform hover:scale-105',
                            onClick: handleOpenStore,
                            title: 'Open Pi Network Store',
                            key: 'coins-balance'
                        }, [
                            React.createElement('i', { className: 'fas fa-coins text-yellow-300 mr-2 text-xl' }),
                            React.createElement('span', { className: 'font-bold text-lg' }, coins.toLocaleString()),
                            React.createElement('i', { className: 'fas fa-store ml-3 text-sm opacity-70' })
                        ]),
                        
                        // Pi balance
                        React.createElement('div', {
                            className: 'flex items-center bg-black/50 backdrop-blur-md rounded-xl px-4 py-2 text-white border border-orange-400/50 shadow-lg',
                            title: 'Pi Network Balance',
                            key: 'pi-balance'
                        }, [
                            React.createElement('span', { className: 'text-orange-300 mr-1 font-bold text-lg' }, 'π'),
                            React.createElement('span', { className: 'font-bold text-sm' }, userPiBalance.toFixed(3))
                        ])
                    ]),
                    
                    // Settings Button
                    React.createElement(SettingsButton, {
                        key: 'settings-button',
                        onClick: () => {
                            setShowSettings(true);
                            setIsPaused(true);
                            stopGameTimer();
                        }
                    }),
                    
                    // Test Pi Button (development only)
                    (window.location.hostname === 'localhost' || window.location.hostname.includes('localhost') || window.location.search.includes('debug=true')) && React.createElement('button', {
                        key: 'test-pi-button',
                        className: 'fixed bottom-4 right-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-bold transition-colors z-30 text-sm',
                        onClick: () => window.testPiTransaction()
                    }, [
                        React.createElement('span', { className: 'text-orange-300 mr-1' }, 'π'),
                        'Test Transaction'
                    ]),
                    
                    // Modals
                    showSettings && React.createElement(SettingsModal, {
                        key: 'settings-modal',
                        show: showSettings,
                        settings,
                        onClose: () => {
                            setShowSettings(false);
                            setIsPaused(false);
                            if (gameState === 'game' && gameTime > 0) {
                                startGameTimer();
                            }
                        },
                        setSettings
                    }),
                    
                    showLevelUp && React.createElement(LevelUpModal, {
                        key: 'level-up-modal',
                        level,
                        onClose: () => setShowLevelUp(false)
                    }),
                    
                    showStore && React.createElement(StoreModal, {
                        key: 'store-modal',
                        show: showStore,
                        onClose: handleCloseStore,
                        coins,
                        onPurchase: handlePurchase,
                        onWatchAd: handleWatchAd,
                        activeTheme,
                        setActiveTheme,
                        activeEffect,
                        setActiveEffect,
                        userInventory
                    }),
                    
                    showGameOver && React.createElement(GameOverModal, {
                        key: 'game-over-modal',
                        show: showGameOver,
                        score,
                        level,
                        coins,
                        onClose: () => {
                            setShowGameOver(false);
                            setGameState('launch');
                        },
                        onRestart: handleGameRestart,
                        onHome: () => {
                            setShowGameOver(false);
                            setGameState('launch');
                        },
                        onShare: handleShareScore
                    })
                ])
        ]);
    };
    
    // Storage utility for compatibility
    const Storage = {
        get: function(key, defaultValue) {
            try {
                const value = localStorage.getItem('colorflow_' + key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (e) {
                console.error("LocalStorage error:", e);
                return defaultValue;
            }
        },
        
        set: function(key, value) {
            try {
                localStorage.setItem('colorflow_' + key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error("LocalStorage error:", e);
                return false;
            }
        }
    };

    // Expose Storage globally for compatibility
    window.Storage = Storage;

    // Pi Payment Service Integration Callbacks
    if (window.piPaymentService) {
        // Override payment completion callback to handle game purchases
        const originalOnPaymentCompleted = window.piPaymentService.onPaymentCompleted;
        window.piPaymentService.onPaymentCompleted = function(payment) {
            console.log('Pi payment completed in game:', payment);
            
            try {
                const metadata = payment.metadata || {};
                
                switch (metadata.type) {
                    case 'coins':
                        if (typeof window.setCoins === 'function' && typeof window.setUserInventory === 'function') {
                            const totalCoins = (metadata.coins || 0) + (metadata.bonus || 0);
                            
                            window.setCoins(prev => prev + totalCoins);
                            window.setUserInventory(prev => ({
                                ...prev,
                                coins: prev.coins + totalCoins
                            }));
                            
                            if (typeof window.addNotification === 'function') {
                                window.addNotification(`+${totalCoins.toLocaleString()} coins purchased with Pi!`, 'success');
                            }
                        }
                        break;
                        
                    case 'theme':
                        if (typeof window.setUserInventory === 'function') {
                            window.setUserInventory(prev => ({
                                ...prev,
                                themes: [...prev.themes, metadata.itemId]
                            }));
                            
                            if (typeof window.addNotification === 'function') {
                                window.addNotification(`Theme unlocked with Pi payment!`, 'success');
                            }
                        }
                        break;
                        
                    case 'effect':
                        if (typeof window.setUserInventory === 'function') {
                            window.setUserInventory(prev => ({
                                ...prev,
                                effects: [...prev.effects, metadata.itemId]
                            }));
                            
                            if (typeof window.addNotification === 'function') {
                                window.addNotification(`Effect unlocked with Pi payment!`, 'success');
                            }
                        }
                        break;
                        
                    case 'powerup':
                        // Powerup already activated, just confirm
                        if (typeof window.addNotification === 'function') {
                            window.addNotification(`${metadata.powerupType} powerup activated with Pi!`, 'success');
                        }
                        break;
                        
                    case 'test':
                        if (typeof window.addNotification === 'function') {
                            window.addNotification('Pi Network test transaction completed successfully! 🎉', 'success');
                        }
                        break;
                }
                
                // Update Pi balance if tracking locally
                if (typeof window.setUserPiBalance === 'function') {
                    const amount = parseFloat(payment.amount || 0);
                    window.setUserPiBalance(prev => Math.max(0, prev - amount));
                }
                
            } catch (error) {
                console.error('Error processing Pi payment completion:', error);
            }
            
            // Call original callback if it exists
            if (originalOnPaymentCompleted) {
                originalOnPaymentCompleted.call(this, payment);
            }
        };
    }
    
    console.log("ColorFlow Game with Pi Network integration successfully defined - Version finale complète");
    
    // Global functions for Pi integration testing
    window.addTestPiBalance = function(amount = 10.0) {
        if (typeof window.setUserPiBalance === 'function') {
            window.setUserPiBalance(prev => prev + amount);
            console.log(`Added π ${amount} to test balance`);
            if (typeof window.addNotification === 'function') {
                window.addNotification(`Test: Added π ${amount} to balance`, 'info');
            }
        }
    };
    
    window.checkPiIntegration = function() {
        console.log('Pi Network Integration Status:');
        console.log('============================');
        console.log('Pi SDK loaded:', typeof Pi !== 'undefined');
        console.log('Pi Payment Service:', !!window.piPaymentService);
        console.log('Pi Payment Service initialized:', window.piPaymentService?.isInitialized);
        console.log('User Pi Balance:', Storage.get('userPiBalance', 0));
        console.log('Store Items with Pi:', Object.values(STORE_ITEMS.coinPacks).filter(item => item.type === 'pi').length);
        console.log('Themes with Pi:', Object.values(STORE_ITEMS.themes).filter(item => item.type === 'pi').length);
        console.log('Effects with Pi:', Object.values(STORE_ITEMS.effects).filter(item => item.type === 'pi').length);
        console.log('Powerups with Pi:', Object.values(POWERUPS).filter(item => item.price > 0).length);
    };

})();