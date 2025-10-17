// GTranslate API Integration for SwaDesi Bazaar
class GTranslateIntegration {
    constructor() {
        this.apiKey = 'YOUR_GOOGLE_TRANSLATE_API_KEY'; // Replace with your actual API key
        this.currentLanguage = 'en';
        this.supportedLanguages = [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
            { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
            { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
            { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
            { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
            { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
            { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
            { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
            { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' }
        ];
        
        this.translatableElements = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'span', 'a', 'button', 'label',
            'div[data-translate]', 'li', 'td', 'th'
        ];
        
        this.init();
    }

    init() {
        this.loadLanguagePreference();
        this.createLanguageSelector();
        this.attachEventListeners();
        this.translatePage(this.currentLanguage);
    }

    // Load saved language preference from localStorage
    loadLanguagePreference() {
        const savedLanguage = localStorage.getItem('swadesi-language');
        if (savedLanguage && this.supportedLanguages.some(lang => lang.code === savedLanguage)) {
            this.currentLanguage = savedLanguage;
        }
    }

    // Create language selector dropdown
    createLanguageSelector() {
        // Remove existing language selectors if any
        const existingSelectors = document.querySelectorAll('.gtranslate-selector');
        existingSelectors.forEach(selector => selector.remove());

        // Create mobile language selector
        this.createMobileSelector();
        
        // Create desktop language selector
        this.createDesktopSelector();
    }

    createMobileSelector() {
        const mobileNav = document.querySelector('.mobile-nav-links');
        if (mobileNav) {
            const languageItem = document.createElement('li');
            languageItem.className = 'language-selector-mobile';
            languageItem.innerHTML = `
                <div class="mobile-language-dropdown">
                    <label for="mobile-language-select">🌐 Language / भाषा</label>
                    <select id="mobile-language-select" class="mobile-language-select">
                        ${this.supportedLanguages.map(lang => 
                            `<option value="${lang.code}" ${lang.code === this.currentLanguage ? 'selected' : ''}>
                                ${lang.nativeName} (${lang.name})
                            </option>`
                        ).join('')}
                    </select>
                </div>
            `;
            mobileNav.appendChild(languageItem);
        }
    }

    createDesktopSelector() {
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            const languageSelector = document.createElement('div');
            languageSelector.className = 'language-selector gtranslate-selector';
            languageSelector.innerHTML = `
                <select id="desktop-language-select">
                    ${this.supportedLanguages.map(lang => 
                        `<option value="${lang.code}" ${lang.code === this.currentLanguage ? 'selected' : ''}>
                            ${lang.nativeName}
                        </option>`
                    ).join('')}
                </select>
            `;
            
            // Insert before auth buttons
            const authButtons = headerActions.querySelector('.auth-buttons');
            if (authButtons) {
                headerActions.insertBefore(languageSelector, authButtons);
            } else {
                headerActions.appendChild(languageSelector);
            }
        }
    }

    attachEventListeners() {
        // Desktop selector
        const desktopSelect = document.getElementById('desktop-language-select');
        if (desktopSelect) {
            desktopSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Mobile selector
        const mobileSelect = document.getElementById('mobile-language-select');
        if (mobileSelect) {
            mobileSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Close mobile nav when language is changed (if mobile nav is open)
        document.addEventListener('languageChanged', () => {
            const mobileNav = document.querySelector('.mobile-nav');
            if (mobileNav && mobileNav.classList.contains('active')) {
                mobileNav.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }

    async changeLanguage(targetLanguage) {
        if (targetLanguage === this.currentLanguage) return;
        
        try {
            await this.translatePage(targetLanguage);
            this.currentLanguage = targetLanguage;
            localStorage.setItem('swadesi-language', targetLanguage);
            
            // Update selectors
            this.updateSelectors();
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: targetLanguage }
            }));
            
            this.showTranslationSuccess(targetLanguage);
        } catch (error) {
            console.error('Translation failed:', error);
            this.showTranslationError();
        }
    }

    async translatePage(targetLanguage) {
        // Show loading state
        this.showLoadingState();

        // Get all translatable text
        const elements = this.getTranslatableElements();
        const textsToTranslate = this.extractTexts(elements);
        
        if (textsToTranslate.length === 0) return;

        try {
            // Translate texts
            const translatedTexts = await this.translateTexts(textsToTranslate, targetLanguage);
            
            // Apply translations
            this.applyTranslations(elements, textsToTranslate, translatedTexts);
            
            // Update dynamic content
            this.updateDynamicContent(targetLanguage);
            
        } catch (error) {
            throw new Error(`Translation failed: ${error.message}`);
        } finally {
            this.hideLoadingState();
        }
    }

    getTranslatableElements() {
        const elements = [];
        this.translatableElements.forEach(selector => {
            const foundElements = document.querySelectorAll(selector);
            foundElements.forEach(el => {
                // Skip elements that should not be translated
                if (!this.shouldSkipTranslation(el)) {
                    elements.push(el);
                }
            });
        });
        return elements;
    }

    shouldSkipTranslation(element) {
        // Skip elements with no-text class or data attributes
        if (element.classList.contains('no-translate') || 
            element.hasAttribute('data-no-translate') ||
            element.closest('[data-no-translate]')) {
            return true;
        }
        
        // Skip code, pre, and script elements
        if (element.tagName === 'CODE' || element.tagName === 'PRE' || element.tagName === 'SCRIPT') {
            return true;
        }
        
        // Skip empty elements or elements with only whitespace
        const text = element.textContent.trim();
        return !text || text.length === 0;
    }

    extractTexts(elements) {
        const texts = [];
        const seenTexts = new Set();
        
        elements.forEach(element => {
            const text = element.textContent.trim();
            if (text && !seenTexts.has(text)) {
                seenTexts.add(text);
                texts.push(text);
            }
        });
        
        return texts;
    }

    async translateTexts(texts, targetLanguage) {
        // For demo purposes, we'll use a mock translation
        // In production, replace this with actual Google Translate API calls
        
        if (this.apiKey === 'YOUR_GOOGLE_TRANSLATE_API_KEY') {
            return this.mockTranslate(texts, targetLanguage);
        }
        
        return await this.googleTranslate(texts, targetLanguage);
    }

    async googleTranslate(texts, targetLanguage) {
        const translations = [];
        
        for (const text of texts) {
            try {
                const response = await fetch(
                    `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            q: text,
                            target: targetLanguage,
                            format: 'text'
                        })
                    }
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                translations.push(data.data.translations[0].translatedText);
            } catch (error) {
                console.error('Translation API error:', error);
                translations.push(text); // Fallback to original text
            }
        }
        
        return translations;
    }

    mockTranslate(texts, targetLanguage) {
        // Mock translation for demo - in real implementation, remove this
        const mockTranslations = {
            'en': texts,
            'hi': texts.map(text => `[हिंदी] ${text}`),
            'ta': texts.map(text => `[தமிழ்] ${text}`),
            'te': texts.map(text => `[తెలుగు] ${text}`),
            'bn': texts.map(text => `[বাংলা] ${text}`),
            'mr': texts.map(text => `[मराठी] ${text}`),
            'gu': texts.map(text => `[ગુજરાતી] ${text}`),
            'kn': texts.map(text => `[ಕನ್ನಡ] ${text}`),
            'ml': texts.map(text => `[മലയാളം] ${text}`),
            'pa': texts.map(text => `[ਪੰਜਾਬੀ] ${text}`)
        };
        
        return mockTranslations[targetLanguage] || texts;
    }

    applyTranslations(elements, originalTexts, translatedTexts) {
        const translationMap = new Map();
        originalTexts.forEach((text, index) => {
            translationMap.set(text, translatedTexts[index]);
        });
        
        elements.forEach(element => {
            const originalText = element.textContent.trim();
            if (translationMap.has(originalText)) {
                element.textContent = translationMap.get(originalText);
                
                // Add translation attributes for tracking
                element.setAttribute('data-original-text', originalText);
                element.setAttribute('data-translated', 'true');
            }
        });
    }

    updateDynamicContent(targetLanguage) {
        // Update page title
        this.translatePageTitle(targetLanguage);
        
        // Update meta description
        this.translateMetaDescription(targetLanguage);
        
        // Update form placeholders
        this.translateFormPlaceholders(targetLanguage);
        
        // Update alt texts for images
        this.translateImageAlts(targetLanguage);
        
        // Update any dynamic content that might not be captured by the main translation
        this.updateCustomContent(targetLanguage);
    }

    translatePageTitle(targetLanguage) {
        const title = document.querySelector('title');
        if (title && title.textContent.includes('SwaDesi Bazaar')) {
            const translations = {
                'en': 'SwaDesi Bazaar | Your Local Market, Powered by AI',
                'hi': 'स्वदेसी बाजार | एआई संचालित आपका स्थानीय बाजार',
                'ta': 'சுவதேசி பஜார் | AI இயக்கப்பட்ட உங்கள் உள்ளூர் சந்தை',
                'te': 'స్వదేశీ బజార్ | AI చేత నడపబడే మీ స్థానిక మార్కెట్',
                'bn': 'স্বদেশী বাজার | AI চালিত আপনার স্থানীয় বাজার'
            };
            title.textContent = translations[targetLanguage] || title.textContent;
        }
    }

    translateMetaDescription(targetLanguage) {
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            const translations = {
                'en': 'Discover authentic local treasures and connect with artisans in your community. Premium quality handcrafted products with modern e-commerce convenience.',
                'hi': 'अपने समुदाय में शिल्पकारों के साथ प्रामाणिक स्थानीय खजाने खोजें और जुड़ें। आधुनिक ई-कॉमर्स सुविधा के साथ प्रीमियम गुणवत्ता वाले हस्तनिर्मित उत्पाद।',
                'ta': 'உங்கள் சமூகத்தில் கைவினைஞர்களுடன் உண்மையான உள்ளூர் பொக்கிஷங்களைக் கண்டறிந்து இணைக்கவும். நவீன ஈ-காமர்ஸ் வசதியுடன் பிரீமியம் தரமான கைவினைப் பொருட்கள்.',
                'te': 'మీ సంఘంలోని శిల్పులతో ప్రామాణికమైన స్థానిక నిధులను కనుగొని కనెక్ట్ అవ్వండి. ఆధునిక ఇ-కామర్స్ సౌలభ్యంతో ప్రీమియం నాణ్యత హస్తకళాత్మక ఉత్పత్తులు.',
                'bn': 'আপনার সম্প্রদায়ের কারিগরদের সাথে খাঁটি স্থানীয় সম্পদ আবিষ্কার করুন এবং সংযুক্ত হন। আধুনিক ই-কমার্স সুবিধা সহ প্রিমিয়াম মানের হস্তনির্মিত পণ্য।'
            };
            metaDescription.setAttribute('content', translations[targetLanguage] || metaDescription.getAttribute('content'));
        }
    }

    translateFormPlaceholders(targetLanguage) {
        const placeholders = document.querySelectorAll('input[placeholder], textarea[placeholder]');
        const placeholderTranslations = {
            'Search for products, artisans, or categories...': {
                'en': 'Search for products, artisans, or categories...',
                'hi': 'उत्पादों, कारीगरों, या श्रेणियों की खोज करें...',
                'ta': 'தயாரிப்புகள், கைவினைஞர்கள் அல்லது வகைகளைத் தேடுங்கள்...',
                'te': 'ఉత్పత్తులు, శిల్పులు లేదా వర్గాల కోసం శోధించండి...',
                'bn': 'পণ্য, কারিগর, বা বিভাগ অনুসন্ধান করুন...'
            },
            'Enter your email': {
                'en': 'Enter your email',
                'hi': 'अपना ईमेल दर्ज करें',
                'ta': 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
                'te': 'మీ ఇమెయిల్ నమోదు చేయండి',
                'bn': 'আপনার ইমেল লিখুন'
            },
            'Enter your password': {
                'en': 'Enter your password',
                'hi': 'अपना पासवर्ड दर्ज करें',
                'ta': 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்',
                'te': 'మీ పాస్వర్డ్ నమోదు చేయండి',
                'bn': 'আপনার পাসওয়ার্ড লিখুন'
            }
            // Add more placeholder translations as needed
        };

        placeholders.forEach(input => {
            const originalPlaceholder = input.getAttribute('data-original-placeholder') || input.getAttribute('placeholder');
            input.setAttribute('data-original-placeholder', originalPlaceholder);
            
            if (placeholderTranslations[originalPlaceholder]) {
                const translated = placeholderTranslations[originalPlaceholder][targetLanguage] || originalPlaceholder;
                input.setAttribute('placeholder', translated);
            }
        });
    }

    translateImageAlts(targetLanguage) {
        const images = document.querySelectorAll('img[alt]');
        const altTranslations = {
            'Handicrafts': {
                'en': 'Handicrafts',
                'hi': 'हस्तशिल्प',
                'ta': 'கைவினைப்பொருட்கள்',
                'te': 'హస్తకళలు',
                'bn': 'হস্তশিল্প'
            },
            'Home Decor': {
                'en': 'Home Decor',
                'hi': 'होम डेकोर',
                'ta': 'வீட்டு அலங்காரம்',
                'te': 'హోమ్ డెకర్',
                'bn': 'বাড়ির সাজসজ্জা'
            }
            // Add more image alt translations as needed
        };

        images.forEach(img => {
            const originalAlt = img.getAttribute('data-original-alt') || img.getAttribute('alt');
            img.setAttribute('data-original-alt', originalAlt);
            
            if (altTranslations[originalAlt]) {
                const translated = altTranslations[originalAlt][targetLanguage] || originalAlt;
                img.setAttribute('alt', translated);
            }
        });
    }

    updateCustomContent(targetLanguage) {
        // Update any custom content that needs special handling
        const customElements = document.querySelectorAll('[data-custom-translate]');
        
        customElements.forEach(element => {
            const key = element.getAttribute('data-custom-translate');
            const translations = this.getCustomTranslations(key, targetLanguage);
            if (translations) {
                element.textContent = translations;
            }
        });
    }

    getCustomTranslations(key, targetLanguage) {
        const customTranslations = {
            'welcome_message': {
                'en': 'Welcome to SwaDesi Bazaar',
                'hi': 'स्वदेसी बाजार में आपका स्वागत है',
                'ta': 'சுவதேசி பஜாருக்கு வரவேற்கிறோம்',
                'te': 'స్వదేశీ బజార్కు స్వాగతం',
                'bn': 'স্বদেশী বাজারে স্বাগতম'
            },
            'feature_ai': {
                'en': 'AI-Powered Assistance',
                'hi': 'एआई-संचालित सहायता',
                'ta': 'AI-இயக்கப்பட்ட உதவி',
                'te': 'AI-శక్తితో సహాయం',
                'bn': 'AI-চালিত সহায়তা'
            }
            // Add more custom translations as needed
        };
        
        return customTranslations[key]?.[targetLanguage] || customTranslations[key]?.['en'];
    }

    updateSelectors() {
        // Update desktop selector
        const desktopSelect = document.getElementById('desktop-language-select');
        if (desktopSelect) {
            desktopSelect.value = this.currentLanguage;
        }

        // Update mobile selector
        const mobileSelect = document.getElementById('mobile-language-select');
        if (mobileSelect) {
            mobileSelect.value = this.currentLanguage;
        }
    }

    showLoadingState() {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'gtranslate-loading';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        `;
        
        loadingOverlay.innerHTML = `
            <div class="loading-spinner" style="
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #D4AF37;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <p style="color: #1A1A1A; font-size: 16px; margin: 0;">Translating content...</p>
        `;
        
        document.body.appendChild(loadingOverlay);
        
        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    hideLoadingState() {
        const loadingOverlay = document.getElementById('gtranslate-loading');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    showTranslationSuccess(language) {
        const languageName = this.supportedLanguages.find(lang => lang.code === language)?.name || language;
        
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'gtranslate-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Page translated to ${languageName}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Add slide animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showTranslationError() {
        const notification = document.createElement('div');
        notification.className = 'gtranslate-notification error';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>Translation failed. Please try again.</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Public method to translate specific text
    async translateText(text, targetLanguage) {
        try {
            if (this.apiKey === 'YOUR_GOOGLE_TRANSLATE_API_KEY') {
                return this.mockTranslate([text], targetLanguage)[0];
            }
            
            const response = await this.googleTranslate([text], targetLanguage);
            return response[0];
        } catch (error) {
            console.error('Text translation failed:', error);
            return text;
        }
    }

    // Public method to get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Public method to get supported languages
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

// Initialize GTranslate when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.gTranslate = new GTranslateIntegration();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GTranslateIntegration;
}