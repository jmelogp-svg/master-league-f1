import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente que DESABILITA COMPLETAMENTE o scroll automático do React Router
 * Especialmente para a rota /admin onde queremos preservar a posição do scroll
 */
function DisableAutoScroll() {
    const { pathname } = useLocation();
    
    // Rotas onde queremos DESABILITAR completamente o scroll automático
    const disableScrollRoutes = ['/admin'];
    const shouldDisable = disableScrollRoutes.includes(pathname);
    
    useEffect(() => {
        if (shouldDisable) {
            // 1. Desabilitar scroll restoration do navegador
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'manual';
            }
            
            // 2. Salvar posição atual do scroll
            const savedPosition = sessionStorage.getItem('admin_scroll_position');
            const currentScroll = window.scrollY || document.documentElement.scrollTop;
            const targetPosition = savedPosition ? parseInt(savedPosition, 10) : currentScroll;
            
            // 3. Interceptar e bloquear QUALQUER tentativa de scroll para o topo
            let isBlocking = true;
            const blockAutoScroll = (e) => {
                if (!isBlocking) return;
                
                const currentPos = window.scrollY || document.documentElement.scrollTop;
                
                // Se alguém tentou forçar scroll para 0, bloquear e restaurar
                if (currentPos === 0 && targetPosition > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    // Restaurar imediatamente
                    window.scrollTo(0, targetPosition);
                    document.documentElement.scrollTop = targetPosition;
                    document.body.scrollTop = targetPosition;
                    
                    return false;
                }
            };
            
            // 4. Interceptar scrollTo e scrollBy
            const originalScrollTo = window.scrollTo;
            const originalScrollBy = window.scrollBy;
            const originalScroll = window.scroll;
            
            window.scrollTo = function(...args) {
                if (!isBlocking) {
                    return originalScrollTo.apply(this, args);
                }
                
                // Se tentar scroll para 0 e temos posição salva, bloquear
                if (args.length === 0 || (args[0] === 0 && args[1] === 0) || (typeof args[0] === 'object' && args[0].top === 0)) {
                    if (targetPosition > 0) {
                        return; // Bloquear completamente
                    }
                }
                
                return originalScrollTo.apply(this, args);
            };
            
            window.scrollBy = function(...args) {
                if (!isBlocking) {
                    return originalScrollBy.apply(this, args);
                }
                
                // Se tentar scroll negativo que levaria para 0, bloquear
                const currentPos = window.scrollY || document.documentElement.scrollTop;
                if (args.length >= 2 && currentPos + args[1] <= 0 && targetPosition > 0) {
                    return; // Bloquear
                }
                
                return originalScrollBy.apply(this, args);
            };
            
            // 5. Monitorar e corrigir continuamente
            const monitorInterval = setInterval(() => {
                if (!isBlocking) return;
                
                const currentPos = window.scrollY || document.documentElement.scrollTop;
                
                // Se o scroll foi forçado para 0, restaurar imediatamente
                if (currentPos === 0 && targetPosition > 0) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/adb2ceb8-1ea0-49a6-8727-37eb1fa55038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DisableAutoScroll.jsx:90',message:'Scroll forced to 0, restoring',data:{currentPos,targetPosition},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                    // #endregion
                    window.scrollTo(0, targetPosition);
                    document.documentElement.scrollTop = targetPosition;
                    document.body.scrollTop = targetPosition;
                }
            }, 5); // Verificar a cada 5ms
            
            // 6. Salvar posição do scroll enquanto o usuário rola
            const saveScrollPosition = () => {
                const scrollY = window.scrollY || document.documentElement.scrollTop;
                if (scrollY > 0) {
                    sessionStorage.setItem('admin_scroll_position', scrollY.toString());
                }
            };
            
            let saveTimeout = null;
            const handleScroll = () => {
                if (saveTimeout) clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveScrollPosition, 100);
            };
            
            // 7. Adicionar listeners
            window.addEventListener('scroll', blockAutoScroll, { passive: false, capture: true });
            window.addEventListener('scroll', handleScroll, { passive: true });
            
            // 8. Restaurar posição imediatamente se necessário
            if (targetPosition > 0) {
                window.scrollTo(0, targetPosition);
                document.documentElement.scrollTop = targetPosition;
                document.body.scrollTop = targetPosition;
            }
            
            // 9. Desabilitar bloqueio após 3 segundos (tempo suficiente para renderização)
            setTimeout(() => {
                isBlocking = false;
            }, 3000);
            
            return () => {
                clearInterval(monitorInterval);
                if (saveTimeout) clearTimeout(saveTimeout);
                window.removeEventListener('scroll', blockAutoScroll, { capture: true });
                window.removeEventListener('scroll', handleScroll);
                
                // Restaurar funções originais
                window.scrollTo = originalScrollTo;
                window.scrollBy = originalScrollBy;
            };
        }
    }, [pathname, shouldDisable]);
    
    return null;
}

export default DisableAutoScroll;

