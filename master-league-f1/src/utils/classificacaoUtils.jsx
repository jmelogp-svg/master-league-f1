// Utilitários compartilhados para telas de classificação (PC)

// Retorna o logo da equipe
export function getTeamLogo(teamName) {
    if (!teamName || teamName.trim() === "") return '/team-logos/f1-reserva.png';
    const t = teamName.normalize('NFD').replace(/[\u0000-\u000f]/g, '').toLowerCase().trim();
    if (t === "reserva" || t.includes('reserva')) return '/team-logos/f1-reserva.png';
    if (t.includes('redbull') || t.includes('red bull') || t.includes('oracle')) return '/team-logos/f1-redbull.png';
    if (t.includes('ferrari')) return '/team-logos/f1-ferrari.png';
    if (t.includes('mercedes')) return '/team-logos/f1-mercedes.png';
    if (t.includes('renault')) return '/team-logos/f1-renault.png';
    if (t.includes('mclaren')) return '/team-logos/f1-mclaren.png';
    if (t.includes('aston')) return '/team-logos/f1-astonmartin.png';
    if (t.includes('alpine')) return '/team-logos/f1-alpine.png';
    if (t.includes('alfaromeo') || t.includes('alfa romeo') || (t.includes('alfa') && !t.includes('tauri'))) return '/team-logos/f1-alfaromeo.png';
    if (t.includes('alphatauri') || t.includes('alpha tauri')) return '/team-logos/f1-alphatauri.png';
    if (t.includes('tororosso') || t.includes('toro rosso') || t.includes('toro')) return '/team-logos/f1-tororosso.png';
    if (t.includes('williams')) return '/team-logos/f1-williams.png';
    if (t.includes('haas')) return '/team-logos/f1-haas.png';
    if (t.includes('sauber') || t.includes('stake') || t.includes('kick')) return '/team-logos/f1-sauber.png';
    if (t.includes('racingpoint') || (t.includes('racing') && t.includes('point'))) return '/team-logos/f1-racingpoint.png';
    if (t.includes('vcarb') || (t.includes('racing') && t.includes('bulls'))) return '/team-logos/f1-racingbulls.png';
    return '/team-logos/f1-reserva.png';
}

// Retorna a cor da equipe
export function getTeamColor(teamName) {
    if (!teamName) return "#94A3B8";
    const t = teamName.toLowerCase();
    if (t.includes("red bull") || t.includes("oracle")) return "var(--f1-redbull)";
    if (t.includes("ferrari")) return "var(--f1-ferrari)";
    if (t.includes("mercedes")) return "var(--f1-mercedes)";
    if (t.includes("mclaren")) return "var(--f1-mclaren)";
    if (t.includes("aston")) return "var(--f1-aston)";
    if (t.includes("alpine")) return "var(--f1-alpine)";
    if (t.includes("haas")) return "var(--f1-haas)";
    if (t.includes("williams")) return "var(--f1-williams)";
    if (t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "var(--f1-sauber)";
    if (t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) return "var(--f1-vcarb)";
    return "#94A3B8";
}

// Formata o nome do piloto (primeiro nome normal, resto em caixa alta)
export function formatDriverName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const lastName = parts.slice(1).join(' ').toUpperCase();
    return `${firstName} ${lastName}`;
}

// Formata o nome do piloto em uma linha (primeiro nome normal, resto em caixa alta)
export function formatDriverNameOneLine(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const lastName = parts.slice(1).join(' ').toUpperCase();
    return `${firstName} ${lastName}`;
}

// Componente de imagem do piloto
import React, { useState, useEffect } from 'react';
export function DriverImage({ name, gridType, season, className, style }) {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0000-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const seasonSrc = `/pilotos/${gridType || 'carreira'}/s${season || 19}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    const [imgSrc, setImgSrc] = useState(seasonSrc);
    useEffect(() => { setImgSrc(seasonSrc); }, [seasonSrc]);
    const handleError = (e) => {
        if (e.target.src.includes(`/s${season}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            e.target.src = shadowSrc;
        }
    };
    return <img src={imgSrc} className={className} style={style} alt={name} onError={handleError} />;
}
