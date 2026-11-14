import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const DEFAULT_LANGUAGE = 'pt-BR';

function getApiKey() {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey || apiKey === 'sua_chave_aqui') {
        const error = new Error('TMDB_API_KEY não configurada no arquivo .env.');
        error.statusCode = 500;
        throw error;
    }
    return apiKey;
}

function buildPosterUrl(posterPath) {
    return posterPath ? `${TMDB_IMAGE_BASE_URL}${posterPath}` : null;
}

async function tmdbGet(endpoint, params = {}) {
    const api_key = getApiKey();
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
        params: {
            api_key,
            language: DEFAULT_LANGUAGE,
            ...params
        }
    });
    return response.data;
}

function normalizeSearchItem(item, forcedTipo = null) {
    const tipo = forcedTipo || (item.media_type === 'movie' ? 'filme' : 'serie');
    return {
        id_tmdb: item.id,
        tipo,
        titulo: item.title || item.name || 'Sem título',
        poster_url: buildPosterUrl(item.poster_path),
        sinopse: item.overview || '',
        data_lancamento: item.release_date || item.first_air_date || null,
        nota_tmdb: typeof item.vote_average === 'number' ? Number(item.vote_average.toFixed(1)) : null
    };
}

export async function buscarConteudo(query, tipo = 'multi', page = 1) {
    const endpointMap = {
        filme: '/search/movie',
        serie: '/search/tv',
        multi: '/search/multi'
    };

    const endpoint = endpointMap[tipo] || endpointMap.multi;
    const data = await tmdbGet(endpoint, { query, page, include_adult: false });

    const forcedTipo = tipo === 'filme' ? 'filme' : tipo === 'serie' ? 'serie' : null;
    const results = (data.results || [])
        .filter((item) => forcedTipo || item.media_type === 'movie' || item.media_type === 'tv')
        .map((item) => normalizeSearchItem(item, forcedTipo));

    return {
        page: data.page || 1,
        total_pages: data.total_pages || 1,
        total_results: data.total_results || results.length,
        results
    };
}

export async function buscarPopulares(tipo = 'multi', page = 1) {
    const endpointMap = {
        filme: '/movie/popular',
        serie: '/tv/popular',
        multi: '/trending/all/week'
    };

    const endpoint = endpointMap[tipo] || endpointMap.multi;
    const data = await tmdbGet(endpoint, { page });

    const forcedTipo = tipo === 'filme' ? 'filme' : tipo === 'serie' ? 'serie' : null;
    const results = (data.results || [])
        .filter((item) => forcedTipo || item.media_type === 'movie' || item.media_type === 'tv')
        .map((item) => normalizeSearchItem(item, forcedTipo));

    return {
        page: data.page || 1,
        total_pages: data.total_pages || 1,
        total_results: data.total_results || results.length,
        results
    };
}

export async function buscarDetalhesFilme(idTmdb) {
    const data = await tmdbGet(`/movie/${idTmdb}`);
    return {
        id_tmdb: data.id,
        tipo: 'filme',
        titulo: data.title || 'Sem título',
        poster_url: buildPosterUrl(data.poster_path),
        sinopse: data.overview || '',
        data_lancamento: data.release_date || null,
        duracao: data.runtime || null,
        nota_tmdb: typeof data.vote_average === 'number' ? Number(data.vote_average.toFixed(1)) : null,
        generos: (data.genres || []).map((g) => g.name)
    };
}

export async function buscarDetalhesSerie(idTmdb) {
    const data = await tmdbGet(`/tv/${idTmdb}`);
    return {
        id_tmdb: data.id,
        tipo: 'serie',
        titulo: data.name || 'Sem título',
        poster_url: buildPosterUrl(data.poster_path),
        sinopse: data.overview || '',
        status_producao: data.status || null,
        data_lancamento: data.first_air_date || null,
        nota_tmdb: typeof data.vote_average === 'number' ? Number(data.vote_average.toFixed(1)) : null,
        generos: (data.genres || []).map((g) => g.name),
        temporadas: (data.seasons || []).map((s) => ({
            id_tmdb_temporada: s.id,
            id_tmdb_serie: data.id,
            numero_temporada: s.season_number,
            nome: s.name || `Temporada ${s.season_number}`,
            total_episodios: s.episode_count || 0
        }))
    };
}

export async function buscarTemporadaSerie(idTmdb, numeroTemporada) {
    const data = await tmdbGet(`/tv/${idTmdb}/season/${numeroTemporada}`);
    return {
        id_tmdb_temporada: data.id,
        id_tmdb_serie: Number(idTmdb),
        numero_temporada: data.season_number,
        nome: data.name || `Temporada ${data.season_number}`,
        episodios: (data.episodes || []).map((ep) => ({
            id_tmdb_episodio: ep.id,
            id_tmdb_temporada: data.id,
            numero_episodio: ep.episode_number,
            titulo: ep.name || `Episódio ${ep.episode_number}`,
            sinopse: ep.overview || '',
            duracao: ep.runtime || null,
            data_exibicao: ep.air_date || null
        }))
    };
}
