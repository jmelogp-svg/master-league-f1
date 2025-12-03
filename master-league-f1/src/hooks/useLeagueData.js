import { useState, useEffect } from 'react';
import Papa from 'papaparse';

const PROXY_URL = "https://corsproxy.io/?";

const LINKS = {
    carreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=321791996&single=true&output=csv",
    light: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1687781433&single=true&output=csv",
    tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=848427722&single=true&output=csv",
    pr: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=984075936&single=true&output=csv"
};

export const useLeagueData = () => {
    const [data, setData] = useState({
        rawCarreira: [],
        rawLight: [],
        rawPR: [],
        tracks: {},
        seasons: [],
        loading: true
    });

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const parseCSV = (text) => new Promise(resolve => {
                    Papa.parse(text, { header: false, skipEmptyLines: true, complete: (res) => resolve(res.data.slice(1)) });
                });

                const [resC, resL, resT, resPR] = await Promise.all([
                    fetch(PROXY_URL + encodeURIComponent(LINKS.carreira)),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.light)),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.tracks)),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.pr))
                ]);

                const rowsC = await parseCSV(await resC.text());
                const rowsL = await parseCSV(await resL.text());
                const rowsT = await parseCSV(await resT.text());
                const rowsPR = await parseCSV(await resPR.text());

                const trackMap = {};
                
                // --- FUNÇÃO DE EXTRAÇÃO E CORREÇÃO DE IMAGENS ---
                const extractImgSrc = (html) => {
                    if (!html) return null;
                    let src = html;
                    
                    // Se for tag HTML, extrai o src
                    if (!html.startsWith('http')) {
                        const match = html.match(/src=['"](.*?)['"]/);
                        src = match ? match[1] : null;
                    }

                    if (src) {
                        // PATCH 1: Corrige erro de digitação "Felipe Kingdom"
                        if (src.includes('Felipe Kingdom')) {
                            src = src.replace('united-Felipe Kingdom', 'united-kingdom');
                        }

                        // PATCH 2: Corrige bandeira da Rússia (Link oficial quebrado/branco)
                        if (src.includes('russia-flag')) {
                            return 'https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg';
                        }
                    }

                    return src;
                };

                rowsT.forEach(row => {
                    const name = row[0]?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
                    if (name) {
                        trackMap[name] = {
                            flag: extractImgSrc(row[1]),
                            circuitName: row[2] || "Autódromo",
                            circuit: extractImgSrc(row[3])
                        };
                    }
                });

                const allSeasons = new Set();
                [...rowsC, ...rowsL].forEach(row => {
                    const s = parseInt(row[3]);
                    if (!isNaN(s) && s > 0) allSeasons.add(s);
                });
                
                setData({
                    rawCarreira: rowsC,
                    rawLight: rowsL,
                    rawPR: rowsPR,
                    tracks: trackMap,
                    seasons: Array.from(allSeasons).sort((a, b) => b - a),
                    loading: false
                });

            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                setData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchAll();
    }, []);

    return data;
};