import {
    adicionarAvaliacaoDb,
    atualizarConteudoDb,
    atualizarEpisodioDb,
    existeConteudoDb,
    existeSerieDb,
    listarConteudosDb,
    obterConteudoPorIdDb,
    obterEstatisticasDb,
    removerAvaliacaoDb,
    removerConteudoDb,
    salvarConteudoDb,
    salvarTemporadaDb
} from '../services/dbService.js';

const TIPOS_VALIDOS = ['filme', 'serie'];
const STATUS_VALIDOS = ['assistido', 'assistindo', 'quero_assistir', 'abandonado'];

function parsePositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function listarConteudos(req, res) {
    try {
        const { tipo, status, favorito, q } = req.query;

        if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
            return res.status(400).json({ erro: 'Tipo inválido. Use "filme" ou "serie".' });
        }

        if (status && !STATUS_VALIDOS.includes(status)) {
            return res.status(400).json({ erro: 'Status inválido.' });
        }

        const filtroFavorito = favorito !== undefined
            ? favorito === '1' || favorito === 'true'
            : undefined;

        const resposta = await listarConteudosDb({
            tipo,
            status,
            favorito: filtroFavorito,
            q: typeof q === 'string' && q.trim() ? q.trim() : undefined
        });

        return res.json(resposta);
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao listar biblioteca.', detalhe: error.message });
    }
}

export async function obterEstatisticas(req, res) {
    try {
        const estatisticas = await obterEstatisticasDb();
        return res.json(estatisticas);
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao calcular estatísticas.', detalhe: error.message });
    }
}

export async function obterConteudoPorId(req, res) {
    try {
        const idTmdb = parsePositiveInt(req.params.id);
        if (!idTmdb) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const conteudo = await obterConteudoPorIdDb(idTmdb);
        if (!conteudo) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        return res.json(conteudo);
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao obter detalhes do conteúdo.', detalhe: error.message });
    }
}

export async function salvarConteudo(req, res) {
    try {
        const {
            id_tmdb,
            tipo,
            titulo,
            poster_url = null,
            sinopse = '',
            favorito = false,
            status_biblioteca = 'quero_assistir',
            data_lancamento = null,
            duracao = null,
            status_producao = null,
            generos = [],
            temporadas = []
        } = req.body;

        const idTmdb = parsePositiveInt(id_tmdb);
        if (!idTmdb) {
            return res.status(400).json({ erro: 'Campo "id_tmdb" válido é obrigatório.' });
        }
        if (!TIPOS_VALIDOS.includes(tipo)) {
            return res.status(400).json({ erro: 'Campo "tipo" deve ser "filme" ou "serie".' });
        }
        if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
            return res.status(400).json({ erro: 'Campo "titulo" é obrigatório.' });
        }
        if (status_biblioteca !== null && !STATUS_VALIDOS.includes(status_biblioteca)) {
            return res.status(400).json({ erro: 'Campo "status_biblioteca" inválido.' });
        }

        const jaExiste = await existeConteudoDb(idTmdb);
        if (jaExiste) {
            return res.status(409).json({ erro: 'Conteúdo já está salvo na biblioteca.' });
        }

        await salvarConteudoDb({
            id_tmdb: idTmdb,
            tipo,
            titulo,
            poster_url,
            sinopse,
            favorito,
            status_biblioteca,
            data_lancamento,
            duracao,
            status_producao,
            generos,
            temporadas
        });

        return res.status(201).json({ mensagem: 'Conteúdo salvo na biblioteca.', id_tmdb: idTmdb });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao salvar conteúdo na biblioteca.', detalhe: error.message });
    }
}

export async function atualizarConteudo(req, res) {
    try {
        const idTmdb = parsePositiveInt(req.params.id);
        if (!idTmdb) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const { status_biblioteca, favorito } = req.body;

        if (status_biblioteca !== undefined && status_biblioteca !== null && !STATUS_VALIDOS.includes(status_biblioteca)) {
            return res.status(400).json({ erro: 'Campo "status_biblioteca" inválido.' });
        }

        if (status_biblioteca === undefined && favorito === undefined) {
            return res.status(400).json({ erro: 'Nenhum campo válido enviado para atualização.' });
        }

        const atualizado = await atualizarConteudoDb(idTmdb, { status_biblioteca, favorito });
        if (!atualizado) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        return res.json(atualizado);
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao atualizar conteúdo.', detalhe: error.message });
    }
}

export async function removerConteudo(req, res) {
    try {
        const idTmdb = parsePositiveInt(req.params.id);
        if (!idTmdb) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const removido = await removerConteudoDb(idTmdb);
        if (!removido) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        return res.json({ mensagem: 'Conteúdo removido da biblioteca.', id_tmdb: idTmdb });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao remover conteúdo.', detalhe: error.message });
    }
}

export async function adicionarAvaliacao(req, res) {
    try {
        const idTmdb = parsePositiveInt(req.params.id);
        if (!idTmdb) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const { nota_pessoal, texto_comentario } = req.body;
        const nota = Number(nota_pessoal);

        if (Number.isNaN(nota) || nota < 0 || nota > 10) {
            return res.status(400).json({ erro: 'A "nota_pessoal" deve ser um número entre 0 e 10.' });
        }

        const existe = await existeConteudoDb(idTmdb);
        if (!existe) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        const idAvaliacao = await adicionarAvaliacaoDb(idTmdb, nota, texto_comentario);

        return res.status(201).json({
            mensagem: 'Avaliação registrada com sucesso.',
            id_avaliacao: idAvaliacao
        });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao registrar avaliação.', detalhe: error.message });
    }
}

export async function removerAvaliacao(req, res) {
    try {
        const idAvaliacao = parsePositiveInt(req.params.idAvaliacao);
        if (!idAvaliacao) {
            return res.status(400).json({ erro: 'ID da avaliação inválido.' });
        }

        const removida = await removerAvaliacaoDb(idAvaliacao);
        if (!removida) {
            return res.status(404).json({ erro: 'Avaliação não encontrada.' });
        }

        return res.json({ mensagem: 'Avaliação removida com sucesso.', id_avaliacao: idAvaliacao });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao remover avaliação.', detalhe: error.message });
    }
}

export async function salvarTemporada(req, res) {
    try {
        const idTmdbSerie = parsePositiveInt(req.params.id);
        if (!idTmdbSerie) {
            return res.status(400).json({ erro: 'ID da série inválido.' });
        }

        const existeSerie = await existeSerieDb(idTmdbSerie);
        if (!existeSerie) {
            return res.status(404).json({ erro: 'Série não encontrada na biblioteca.' });
        }

        const { id_tmdb_temporada, numero_temporada, nome, episodios = [] } = req.body;
        const idTemporada = parsePositiveInt(id_tmdb_temporada);
        if (!idTemporada) {
            return res.status(400).json({ erro: 'Campo "id_tmdb_temporada" válido é obrigatório.' });
        }

        await salvarTemporadaDb(idTmdbSerie, {
            id_tmdb_temporada: idTemporada,
            numero_temporada,
            nome,
            episodios
        });

        return res.status(201).json({ mensagem: 'Temporada e episódios sincronizados.', id_tmdb_temporada: idTemporada });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao salvar temporada.', detalhe: error.message });
    }
}

export async function atualizarEpisodio(req, res) {
    try {
        const idEpisodio = parsePositiveInt(req.params.idEpisodio);
        if (!idEpisodio) {
            return res.status(400).json({ erro: 'ID do episódio inválido.' });
        }

        const { assistido } = req.body;
        if (typeof assistido !== 'boolean' && assistido !== 0 && assistido !== 1) {
            return res.status(400).json({ erro: 'Campo "assistido" deve ser booleano (true/false).' });
        }

        const episodio = await atualizarEpisodioDb(idEpisodio, assistido);
        if (!episodio) {
            return res.status(404).json({ erro: 'Episódio não encontrado.' });
        }

        return res.json(episodio);
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao atualizar episódio.', detalhe: error.message });
    }
}
