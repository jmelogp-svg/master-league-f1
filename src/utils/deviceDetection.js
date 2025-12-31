/**
 * Utilitários para detecção de dispositivo
 * Detecta se o usuário está em PC ou celular de forma robusta
 */

/**
 * Detecta se o dispositivo é mobile usando múltiplas estratégias
 * @returns {boolean} - true se for mobile, false se for PC
 */
export function isMobileDevice() {
    // Estratégia 1: User Agent (mais confiável para detectar dispositivos móveis reais)
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    const isMobileUA = mobileRegex.test(userAgent);
    
    // Estratégia 2: Largura da tela (compatível com o padrão do projeto: <= 768px = mobile)
    const isMobileWidth = window.innerWidth <= 768;
    
    // Estratégia 3: Touch support (dispositivos móveis geralmente têm touch)
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Estratégia 4: Orientação (mobile pode mudar orientação)
    const hasOrientation = 'orientation' in window || 'onorientationchange' in window;
    
    // Combinação: Se user agent indica mobile OU (largura pequena E tem touch), é mobile
    // Prioriza user agent pois é mais confiável para diferenciar dispositivos reais
    const isMobile = isMobileUA || (isMobileWidth && hasTouchSupport && hasOrientation);
    
    // Log de debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
        console.log('📱 Device Detection:', {
            userAgent: userAgent.substring(0, 50) + '...',
            isMobileUA,
            isMobileWidth,
            width: window.innerWidth,
            hasTouchSupport,
            hasOrientation,
            isMobile,
            maxTouchPoints: navigator.maxTouchPoints
        });
    }
    
    return isMobile;
}

/**
 * Detecta se o dispositivo é PC/Desktop
 * @returns {boolean} - true se for PC, false se for mobile
 */
export function isDesktopDevice() {
    return !isMobileDevice();
}

/**
 * Obtém informações detalhadas sobre o dispositivo
 * @returns {Object} - Objeto com informações do dispositivo
 */
export function getDeviceInfo() {
    const isMobile = isMobileDevice();
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return {
        isMobile,
        isDesktop: !isMobile,
        userAgent,
        width,
        height,
        hasTouch,
        platform: navigator.platform || 'unknown'
    };
}

/**
 * Obtém a chave de 2FA específica para o dispositivo
 * No mobile, adiciona sufixo para diferenciar do PC
 * @param {string} email - Email do usuário
 * @returns {string} - Chave de 2FA específica para o dispositivo
 */
export function get2FAKeyForDevice(email) {
    const baseKey = `ml_pilot_2fa_ok:${(email || '').toLowerCase().trim()}`;
    const isMobile = isMobileDevice();
    
    // No mobile, adiciona sufixo para diferenciar do PC
    // Isso permite que o usuário tenha sessões diferentes em PC e celular
    return isMobile ? `${baseKey}:mobile` : `${baseKey}:desktop`;
}

/**
 * Verifica se o 2FA está validado para o dispositivo atual
 * @param {string} email - Email do usuário
 * @returns {boolean} - true se 2FA está validado para este dispositivo
 */
export function is2FAValidatedForDevice(email) {
    const key = get2FAKeyForDevice(email);
    return localStorage.getItem(key) === 'true';
}

/**
 * Salva flag de 2FA validado para o dispositivo atual
 * @param {string} email - Email do usuário
 */
export function set2FAValidatedForDevice(email) {
    const key = get2FAKeyForDevice(email);
    localStorage.setItem(key, 'true');
    console.log('💾 2FA salvo no localStorage para dispositivo:', isMobileDevice() ? 'mobile' : 'desktop', key);
}

/**
 * Remove flag de 2FA para o dispositivo atual
 * @param {string} email - Email do usuário
 */
export function clear2FAForDevice(email) {
    const key = get2FAKeyForDevice(email);
    localStorage.removeItem(key);
    console.log('🗑️ 2FA removido do localStorage para dispositivo:', isMobileDevice() ? 'mobile' : 'desktop');
}

/**
 * Remove todas as flags de 2FA (PC e mobile) para um email
 * @param {string} email - Email do usuário
 */
export function clearAll2FAForEmail(email) {
    const baseKey = `ml_pilot_2fa_ok:${(email || '').toLowerCase().trim()}`;
    localStorage.removeItem(`${baseKey}:mobile`);
    localStorage.removeItem(`${baseKey}:desktop`);
    // Também remove chave antiga (sem sufixo) para compatibilidade
    localStorage.removeItem(baseKey);
    console.log('🗑️ Todas as flags de 2FA removidas para:', email);
}

