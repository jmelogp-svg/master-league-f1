import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Navegação inteligente para a Home com parâmetros
    const handleHomeNav = (view) => {
        setIsMenuOpen(false);
        // Força a navegação para a raiz com a query string
        navigate({
            pathname: '/',
            search: `?view=${view}`,
        });
    };

    // Verifica se o botão deve estar aceso
    const getActive = (viewName) => {
        const params = new URLSearchParams(location.search);
        const currentView = params.get('view') || 'hub';
        // Só ativa se estivermos na Home (/)
        if (location.pathname !== '/') return '';
        return currentView === viewName ? 'active' : '';
    };

    const getActiveRoute = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="navbar">
            <div className="nav-logo" onClick={() => handleHomeNav('hub')} style={{cursor:'pointer'}}>
                MASTER <span>LEAGUE</span>
            </div>
            
            <button className="mobile-menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
            
            <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                {/* Botões da Home */}
                <button className={`nav-link-btn ${getActive('hub')}`} onClick={() => handleHomeNav('hub')}>HUB</button>
                <button className={`nav-link-btn ${getActive('drivers')}`} onClick={() => handleHomeNav('drivers')}>CLASSIFICAÇÃO</button>
                <button className={`nav-link-btn ${getActive('calendar')}`} onClick={() => handleHomeNav('calendar')}>CALENDÁRIO</button>
                
                {/* Links de Páginas */}
                <Link to="/mercado" className={`nav-link-btn ${getActiveRoute('/mercado')}`} onClick={() => setIsMenuOpen(false)}>MERCADO</Link>
                <Link to="/analises" className={`nav-link-btn ${getActiveRoute('/analises')}`} onClick={() => setIsMenuOpen(false)}>ANÁLISES</Link>
                <Link to="/regulamento" className={`nav-link-btn ${getActiveRoute('/regulamento')}`} onClick={() => setIsMenuOpen(false)}>REGULAMENTO</Link>
                <Link to="/halloffame" className={`nav-link-btn ${getActiveRoute('/halloffame')}`} onClick={() => setIsMenuOpen(false)}>HALL DA FAMA</Link>
                <Link to="/powerranking" className={`nav-link-btn ${getActiveRoute('/powerranking')}`} style={{color:'#FFD700'}} onClick={() => setIsMenuOpen(false)}>POWER RANKING</Link>
                
                <Link to="/login" className="btn-login" onClick={() => setIsMenuOpen(false)}>Área do Piloto</Link>
            </div>
        </nav>
    );
}

export default Navbar;