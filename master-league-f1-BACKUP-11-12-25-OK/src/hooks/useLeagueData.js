import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';

const PROXY_URL = "https://corsproxy.io/?";

const LINKS = {
    carreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=321791996&single=true&output=csv",
    light: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1687781433&single=true&output=csv",
    dataCarreira: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=321791996&single=true&output=csv",
    dataLight: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1687781433&single=true&output=csv",
    tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=848427722&single=true&output=csv",
    pr: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=984075936&single=true&output=csv"
};

// Cache global para evitar recarregar dados
const cacheData = {
    rawCarreira: null,
    rawLight: null,
    rawPR: null,
    tracks: null,
    datesCarreira: null,
    datesLight: null,
    seasons: null,
    lastFetch: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useLeagueData = () => {
    const [data, setData] = useState({
        rawCarreira: [],
        rawLight: [],
        rawPR: [],
        tracks: {},
        datesCarreira: {},
        datesLight: {},
        seasons: [],
        loading: true
    });
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Verifica cache
                const now = Date.now();
                if (cacheData.rawCarreira && (now - cacheData.lastFetch) < CACHE_DURATION) {
                    if (isMounted.current) {
                        setData({
                            rawCarreira: cacheData.rawCarreira,
                            rawLight: cacheData.rawLight,
                            rawPR: cacheData.rawPR,
                            tracks: cacheData.tracks,
                            datesCarreira: cacheData.datesCarreira,
                            datesLight: cacheData.datesLight,
                            seasons: cacheData.seasons,
                            loading: false
                        });
                    }
                    return;
                }

                const parseCSV = (text) => new Promise(resolve => {
                    Papa.parse(text, { header: false, skipEmptyLines: true, complete: (res) => resolve(res.data.slice(1)) });
                });

                const [resC, resL, resT, resPR, resDateC, resDateL] = await Promise.all([
                    fetch(PROXY_URL + encodeURIComponent(LINKS.carreira)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.light)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.tracks)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.pr)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.dataCarreira)).catch(() => ({ text: async () => '[]' })),
                    fetch(PROXY_URL + encodeURIComponent(LINKS.dataLight)).catch(() => ({ text: async () => '[]' }))
                ]);

                const rowsC = await parseCSV(await resC.text());
                const rowsL = await parseCSV(await resL.text());
                const rowsT = await parseCSV(await resT.text());
                const rowsPR = await parseCSV(await resPR.text());
                const rowsDateC = await parseCSV(await resDateC.text());
                const rowsDateL = await parseCSV(await resDateL.text());

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

                // Processando datas: Coluna A (data), Coluna D (temporada), Coluna F (etapa)
                const datesCarreiraMap = {};
                const datesLightMap = {};

                rowsDateC.forEach(row => {
                    const date = row[0]; // Coluna A
                    const season = row[3]; // Coluna D
                    const round = row[5]; // Coluna F
                    if (date && season && round) {
                        const key = `${season}-${round}`;
                        datesCarreiraMap[key] = date;
                    }
                });

                rowsDateL.forEach(row => {
                    const date = row[0]; // Coluna A
                    const season = row[3]; // Coluna D
                    const round = row[5]; // Coluna F
                    if (date && season && round) {
                        const key = `${season}-${round}`;
                        datesLightMap[key] = date;
                    }
                });
                
                const newData = {
                    rawCarreira: rowsC,
                    rawLight: rowsL,
                    rawPR: rowsPR,
                    tracks: trackMap,
                    datesCarreira: datesCarreiraMap,
                    datesLight: datesLightMap,
                    seasons: Array.from(allSeasons).sort((a, b) => b - a)
                };

                // Atualiza cache
                cacheData.rawCarreira = newData.rawCarreira;
                cacheData.rawLight = newData.rawLight;
                cacheData.rawPR = newData.rawPR;
                cacheData.tracks = newData.tracks;
                cacheData.datesCarreira = newData.datesCarreira;
                cacheData.datesLight = newData.datesLight;
                cacheData.seasons = newData.seasons;
                cacheData.lastFetch = now;

                if (isMounted.current) {
                    setData({
                        ...newData,
                        loading: false
                    });
                }

            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                if (isMounted.current) {
                    setData(prev => ({ ...prev, loading: false }));
                }
            }
        };

        fetchAll();
    }, []);

    return data;
};