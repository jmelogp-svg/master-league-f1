import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Noticias = () => {
    const [noticias, setNoticias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroCategoria, setFiltroCategoria] = useState('todas');
    const [categorias, setCategorias] = useState(['todas']);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        carregarNoticias();
    }, []);

    const carregarNoticias = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('noticias')
                .select('*')
                .order('id', { ascending: false });
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                setNoticias(data);
                
                // Extrair categorias únicas
                const cats = ['todas', ...new Set(data.map(n => n.category).filter(Boolean))];
                setCategorias(cats);
            }
        } catch (err) {
            console.error('Erro ao carregar notícias:', err);
        } finally {
            setLoading(false);
        }
    };

    const getSupabaseImageUrl = (id) => {
        try {
            const { data } = supabase.storage.from('noticias').getPublicUrl(`noticia${id}`);
            return data?.publicUrl || null;
        } catch {
            return null;
        }
    };

    const noticiasFiltradas = filtroCategoria === 'todas' 
        ? noticias 
        : noticias.filter(n => n.category === filtroCategoria);

    return (
        <div className="noticias-portal-page">
            {/* Header */}
            <header className="noticias-portal-header">
                <div className="noticias-portal-hero">
                    <h1>📰 Central de Notícias</h1>
                    <p>Fique por dentro de tudo que acontece na Master League F1</p>
                </div>
            </header>

            {/* Filtros de Categoria */}
            <div className="noticias-filters">
                {categorias.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFiltroCategoria(cat)}
                        className={`filter-btn ${filtroCategoria === cat ? 'active' : ''}`}
                    >
                        {cat === 'todas' ? '🏁 Todas' : cat}
                    </button>
                ))}
            </div>

            {/* Grid de Notícias */}
            <div className="noticias-portal-container">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                        <p>⏳ Carregando notícias...</p>
                    </div>
                ) : noticiasFiltradas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                        <p>📭 Nenhuma notícia encontrada nesta categoria</p>
                    </div>
                ) : (
                    <div className="noticias-portal-grid">
                        {noticiasFiltradas.map((noticia, idx) => {
                            const imageUrl = getSupabaseImageUrl(noticia.id);
                            const isFeatured = idx === 0 || noticia.featured;
                            
                            return (
                                <Link
                                    key={noticia.id}
                                    to={`/noticias/${noticia.id}`}
                                    className={`noticia-portal-card ${isFeatured ? 'featured' : ''}`}
                                >
                                    <div className="noticia-portal-image">
                                        {imageUrl ? (
                                            <img 
                                                src={imageUrl} 
                                                alt={noticia.title}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="noticia-portal-placeholder">
                                                <span>📰</span>
                                            </div>
                                        )}
                                        <div className="noticia-portal-overlay"></div>
                                    </div>
                                    <div className="noticia-portal-content">
                                        <div className="noticia-portal-meta">
                                            <span className="noticia-portal-category">{noticia.category}</span>
                                            <span className="noticia-portal-date">{noticia.date}</span>
                                        </div>
                                        <h3 className="noticia-portal-title">{noticia.title}</h3>
                                        {noticia.subtitle && (
                                            <p className="noticia-portal-subtitle">{noticia.subtitle}</p>
                                        )}
                                        {noticia.excerpt && (
                                            <p className="noticia-portal-excerpt">
                                                {noticia.excerpt.substring(0, 120)}...
                                            </p>
                                        )}
                                        <div className="noticia-portal-link">
                                            Ler matéria completa →
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Noticias;