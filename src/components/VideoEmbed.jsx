import { getVideoEmbedUrl } from '../utils/videoEmbed';
import { isMobileDevice } from '../utils/deviceDetection';

/**
 * Componente para exibir vídeos embedados
 * 
 * @param {string} videoLink - URL do vídeo
 * @param {string} title - Título do iframe (acessibilidade)
 * @param {string} borderColor - Cor da borda do vídeo
 * @param {boolean} isMobile - Se está em dispositivo mobile (opcional, detecta automaticamente se não fornecido)
 */
function VideoEmbed({ videoLink, title = "Vídeo", borderColor = 'rgba(255,255,255,0.1)', isMobile: isMobileProp }) {
    if (!videoLink) {
        return null;
    }

    // Detectar mobile se não fornecido
    const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileDevice();

    const embedUrl = getVideoEmbedUrl(videoLink);
    
    // Verificar se é um YouTube Short
    const isYouTubeShort = videoLink.includes('/shorts/');
    
    // Verificar se é Steam CDN (usa tag <video> HTML5)
    const isSteamCDN = videoLink.includes('cdn.steamusercontent.com');
    
    if (embedUrl) {
        // Para Steam CDN, usar tag <video> HTML5
        if (isSteamCDN) {
            return (
                <div 
                    style={{
                        width: '100%',
                        background: '#000',
                        borderRadius: isMobile ? '6px' : '8px',
                        overflow: 'hidden',
                        border: `2px solid ${borderColor}`,
                        position: 'relative',
                        aspectRatio: '16 / 9',
                        boxSizing: 'border-box'
                    }}
                >
                    <video
                        src={embedUrl}
                        controls
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            outline: 'none'
                        }}
                        preload="metadata"
                    >
                        Seu navegador não suporta a tag de vídeo.
                    </video>
                </div>
            );
        }
        
        // Para YouTube Shorts, usar formato vertical 9:16
        // Para vídeos normais, usar formato 16:9 (1920x1080p)
        const aspectRatio = isYouTubeShort ? '9 / 16' : '16 / 9';
        
        // No mobile, ajustar largura máxima para Shorts
        const containerMaxWidth = isMobile 
            ? (isYouTubeShort ? '100%' : '100%')
            : (isYouTubeShort ? '400px' : '100%');
        const containerMargin = isMobile ? '0' : (isYouTubeShort ? '0 auto' : '0');
        
        return (
            <div 
                style={{
                    width: '100%',
                    maxWidth: containerMaxWidth,
                    margin: containerMargin,
                    background: '#000',
                    borderRadius: isMobile ? '6px' : '8px',
                    overflow: 'hidden',
                    border: `2px solid ${borderColor}`,
                    position: 'relative',
                    aspectRatio: aspectRatio,
                    // No mobile, garantir que o vídeo não ultrapasse a largura da tela
                    boxSizing: 'border-box'
                }}
            >
                <iframe
                    src={embedUrl}
                    title={title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        // Garantir que o iframe respeite o container no mobile
                        maxWidth: '100%'
                    }}
                />
            </div>
        );
    }
    
    // Fallback para vídeos não suportados
    return (
        <a
            href={videoLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'block',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                color: '#3B82F6',
                textDecoration: 'none',
                textAlign: 'center',
                fontSize: '14px'
            }}
        >
            🔗 Ver Vídeo Externo
        </a>
    );
}

export default VideoEmbed;

