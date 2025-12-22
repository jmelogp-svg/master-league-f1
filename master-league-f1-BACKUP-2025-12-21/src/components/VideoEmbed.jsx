import { getVideoEmbedUrl } from '../utils/videoEmbed';

/**
 * Componente para exibir vídeos embedados
 * 
 * @param {string} videoLink - URL do vídeo
 * @param {string} title - Título do iframe (acessibilidade)
 * @param {string} borderColor - Cor da borda do vídeo
 */
function VideoEmbed({ videoLink, title = "Vídeo", borderColor = 'rgba(255,255,255,0.1)' }) {
    if (!videoLink) {
        return null;
    }

    const embedUrl = getVideoEmbedUrl(videoLink);
    
    // Verificar se é um YouTube Short
    const isYouTubeShort = videoLink.includes('/shorts/');
    
    if (embedUrl) {
        // Para YouTube Shorts, usar formato vertical 9:16
        // Para vídeos normais, usar formato 16:9 (1920x1080p)
        const aspectRatio = isYouTubeShort ? '9 / 16' : '16 / 9';
        const containerMaxWidth = isYouTubeShort ? '400px' : '100%';
        const containerMargin = isYouTubeShort ? '0 auto' : '0';
        
        return (
            <div 
                style={{
                    width: '100%',
                    maxWidth: containerMaxWidth,
                    margin: containerMargin,
                    background: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `2px solid ${borderColor}`,
                    position: 'relative',
                    aspectRatio: aspectRatio
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
                        left: 0
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

