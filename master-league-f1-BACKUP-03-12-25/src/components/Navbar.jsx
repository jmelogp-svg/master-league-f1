import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleHomeNav = (view) => {
        setIsMenuOpen(false);
        navigate(`/?view=${view}`);
    };

    const getActive = (viewName) => {
        const params = new URLSearchParams(location.search);
        const currentView = params.get('view') || 'hub';
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
                <button className={`nav-link-btn ${getActive('hub')}`} onClick={() => handleHomeNav('hub')}>HUB</button>
                <button className={`nav-link-btn ${getActive('drivers')}`} onClick={() => handleHomeNav('drivers')}>CLASSIFICAÇÃO</button>
                <button className={`nav-link-btn ${getActive('calendar')}`} onClick={() => handleHomeNav('calendar')}>CALENDÁRIO</button>
                
                <Link to="/mercado" className={`nav-link-btn ${getActiveRoute('/mercado')}`} onClick={() => setIsMenuOpen(false)}>MERCADO</Link>
                
                {/* LINK ATUALIZADO AQUI */}
                <Link to="/telemetria" className={`nav-link-btn ${getActiveRoute('/telemetria')}`} onClick={() => setIsMenuOpen(false)}>TELEMETRIA</Link>
                
                <Link to="/regulamento" className={`nav-link-btn ${getActiveRoute('/regulamento')}`} onClick={() => setIsMenuOpen(false)}>REGULAMENTO</Link>
                <Link to="/halloffame" className={`nav-link-btn ${getActiveRoute('/halloffame')}`} onClick={() => setIsMenuOpen(false)}>HALL DA FAMA</Link>
                <Link to="/powerranking" className={`nav-link-btn ${getActiveRoute('/powerranking')}`} style={{color:'#FFD700'}} onClick={() => setIsMenuOpen(false)}>POWER RANKING</Link>
                
                <Link to="/login" className="btn-login" onClick={() => setIsMenuOpen(false)}>Área do Piloto</Link>
            </div>
        </nav>
    );
}

export default Navbar;