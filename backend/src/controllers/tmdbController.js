import * as tmdbService from '../services/tmdbService.js';

function handleTmdbError(res, error, fallbackMessage) {
    const status = error.statusCode || error.response?.status || 500;
    const message =
        error.response?.data?.status_message ||
        error.message ||
        fallbackMessage;

    return res.status(status).json({ erro: message });
}

export async function buscar(req, res) {
    try {
        const query = (req.query.q || '').trim();
        if (!query) {
            return res.status(400).json({ erro: 'O parâmetro de busca "q" é obrigatório.' });
        }

        const tipo = req.query.tipo || 'multi';
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

        const resultado = await tmdbService.buscarConteudo(query, tipo, page);
        return res.json(resultado);
    } catch (error) {
        return handleTmdbError(res, error, 'Erro ao buscar conteúdos no TMDB.');
    }
}

export async function populares(req, res) {
    try {
        const tipo = req.query.tipo || 'multi';
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

        const resultado = await tmdbService.buscarPopulares(tipo, page);
        return res.json(resultado);
    } catch (error) {
        return handleTmdbError(res, error, 'Erro ao buscar conteúdos populares no TMDB.');
    }
}

export async function detalhesFilme(req, res) {
    try {
        const idTmdb = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(idTmdb) || idTmdb <= 0) {
            return res.status(400).json({ erro: 'ID do filme inválido.' });
        }

        const filme = await tmdbService.buscarDetalhesFilme(idTmdb);
        return res.json(filme);
    } catch (error) {
        return handleTmdbError(res, error, 'Erro ao buscar detalhes do filme no TMDB.');
    }
}

export async function detalhesSerie(req, res) {
    try {
        const idTmdb = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(idTmdb) || idTmdb <= 0) {
            return res.status(400).json({ erro: 'ID da série inválido.' });
        }

        const serie = await tmdbService.buscarDetalhesSerie(idTmdb);
        return res.json(serie);
    } catch (error) {
        return handleTmdbError(res, error, 'Erro ao buscar detalhes da série no TMDB.');
    }
}

export async function detalhesTemporada(req, res) {
    try {
        const idTmdb = Number.parseInt(req.params.id, 10);
        const numeroTemporada = Number.parseInt(req.params.numero, 10);

        if (!Number.isInteger(idTmdb) || idTmdb <= 0) {
            return res.status(400).json({ erro: 'ID da série inválido.' });
        }
        if (!Number.isInteger(numeroTemporada) || numeroTemporada < 0) {
            return res.status(400).json({ erro: 'Número da temporada inválido.' });
        }

        const temporada = await tmdbService.buscarTemporadaSerie(idTmdb, numeroTemporada);
        return res.json(temporada);
    } catch (error) {
        return handleTmdbError(res, error, 'Erro ao buscar detalhes da temporada no TMDB.');
    }
}
