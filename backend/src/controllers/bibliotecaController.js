import { getDb } from '../services/dbService.js';

const TIPOS_VALIDOS = ['filme', 'serie'];
const STATUS_VALIDOS = ['assistido', 'assistindo', 'quero_assistir', 'abandonado'];

function parsePositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function listarConteudos(req, res) {
    try {
        const db = await getDb();
        const { tipo, status, favorito } = req.query;

        const conditions = [];
        const params = [];

        if (tipo) {
            if (!TIPOS_VALIDOS.includes(tipo)) {
                return res.status(400).json({ erro: 'Tipo inválido. Use "filme" ou "serie".' });
            }
            conditions.push('c.tipo = ?');
            params.push(tipo);
        }

        if (status) {
            if (!STATUS_VALIDOS.includes(status)) {
                return res.status(400).json({ erro: 'Status inválido.' });
            }
            conditions.push('c.status_biblioteca = ?');
            params.push(status);
        }

        if (favorito !== undefined) {
            const isFav = favorito === '1' || favorito === 'true';
            conditions.push('c.favorito = ?');
            params.push(isFav ? 1 : 0);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const itens = await db.all(
            `
            SELECT
                c.*,
                f.data_lancamento,
                f.duracao,
                s.status_producao,
                (
                    SELECT a.nota_pessoal
                    FROM avaliacao a
                    WHERE a.id_tmdb = c.id_tmdb
                    ORDER BY a.data_avaliacao DESC, a.id_avaliacao DESC
                    LIMIT 1
                ) AS nota_pessoal
            FROM conteudo c
            LEFT JOIN filme f ON f.id_tmdb = c.id_tmdb
            LEFT JOIN serie s ON s.id_tmdb = c.id_tmdb
            ${whereClause}
            ORDER BY c.titulo ASC
            `,
            params
        );

        const generosRows = await db.all('SELECT id_tmdb, nome_genero FROM conteudo_generos');
        const generosPorItem = new Map();
        for (const row of generosRows) {
            if (!generosPorItem.has(row.id_tmdb)) {
                generosPorItem.set(row.id_tmdb, []);
            }
            generosPorItem.get(row.id_tmdb).push(row.nome_genero);
        }

        const resposta = itens.map((item) => ({
            ...item,
            favorito: Boolean(item.favorito),
            generos: generosPorItem.get(item.id_tmdb) || []
        }));

        return res.json(resposta);
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao listar biblioteca.', detalhe: error.message });
    }
}

export async function obterEstatisticas(req, res) {
    try {
        const db = await getDb();

        const resumo = await db.get(`
            SELECT
                COUNT(*) AS total_conteudos,
                SUM(CASE WHEN tipo = 'filme' THEN 1 ELSE 0 END) AS total_filmes,
                SUM(CASE WHEN tipo = 'serie' THEN 1 ELSE 0 END) AS total_series,
                SUM(CASE WHEN favorito = 1 THEN 1 ELSE 0 END) AS total_favoritos,
                SUM(CASE WHEN status_biblioteca = 'assistido' THEN 1 ELSE 0 END) AS total_assistidos,
                SUM(CASE WHEN status_biblioteca = 'assistindo' THEN 1 ELSE 0 END) AS total_assistindo,
                SUM(CASE WHEN status_biblioteca = 'quero_assistir' THEN 1 ELSE 0 END) AS total_quero_assistir,
                SUM(CASE WHEN status_biblioteca = 'abandonado' THEN 1 ELSE 0 END) AS total_abandonados
            FROM conteudo
        `);

        const tempoFilmes = await db.get(`
            SELECT COALESCE(SUM(f.duracao), 0) AS minutos
            FROM conteudo c
            INNER JOIN filme f ON f.id_tmdb = c.id_tmdb
            WHERE c.status_biblioteca = 'assistido'
        `);

        const tempoEpisodios = await db.get(`
            SELECT
                COUNT(*) AS episodios_assistidos,
                COALESCE(SUM(duracao), 0) AS minutos
            FROM episodio
            WHERE assistido = 1
        `);

        const mediaNotas = await db.get(`
            SELECT ROUND(AVG(nota_pessoal), 1) AS media_notas
            FROM avaliacao
        `);

        return res.json({
            total_conteudos: resumo?.total_conteudos || 0,
            total_filmes: resumo?.total_filmes || 0,
            total_series: resumo?.total_series || 0,
            total_favoritos: resumo?.total_favoritos || 0,
            por_status: {
                assistido: resumo?.total_assistidos || 0,
                assistindo: resumo?.total_assistindo || 0,
                quero_assistir: resumo?.total_quero_assistir || 0,
                abandonado: resumo?.total_abandonados || 0
            },
            episodios_assistidos: tempoEpisodios?.episodios_assistidos || 0,
            tempo_total_minutos: (tempoFilmes?.minutos || 0) + (tempoEpisodios?.minutos || 0),
            media_notas: mediaNotas?.media_notas ?? null
        });
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

        const db = await getDb();
        const conteudo = await db.get(
            `
            SELECT
                c.*,
                f.data_lancamento,
                f.duracao,
                s.status_producao
            FROM conteudo c
            LEFT JOIN filme f ON f.id_tmdb = c.id_tmdb
            LEFT JOIN serie s ON s.id_tmdb = c.id_tmdb
            WHERE c.id_tmdb = ?
            `,
            [idTmdb]
        );

        if (!conteudo) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        const generosRows = await db.all(
            'SELECT nome_genero FROM conteudo_generos WHERE id_tmdb = ?',
            [idTmdb]
        );

        const avaliacoesRows = await db.all(
            `
            SELECT
                a.id_avaliacao,
                a.nota_pessoal,
                a.data_avaliacao,
                ac.id_comentario,
                ac.texto_comentario
            FROM avaliacao a
            LEFT JOIN avaliacao_comentario ac ON ac.id_avaliacao = a.id_avaliacao
            WHERE a.id_tmdb = ?
            ORDER BY a.data_avaliacao DESC, a.id_avaliacao DESC
            `,
            [idTmdb]
        );

        const avaliacoesMap = new Map();
        for (const row of avaliacoesRows) {
            if (!avaliacoesMap.has(row.id_avaliacao)) {
                avaliacoesMap.set(row.id_avaliacao, {
                    id_avaliacao: row.id_avaliacao,
                    nota_pessoal: row.nota_pessoal,
                    data_avaliacao: row.data_avaliacao,
                    comentarios: []
                });
            }
            if (row.id_comentario) {
                avaliacoesMap.get(row.id_avaliacao).comentarios.push({
                    id_comentario: row.id_comentario,
                    texto_comentario: row.texto_comentario
                });
            }
        }

        let temporadas = [];
        if (conteudo.tipo === 'serie') {
            const temporadasRows = await db.all(
                'SELECT * FROM temporada WHERE id_tmdb_serie = ? ORDER BY numero_temporada ASC',
                [idTmdb]
            );
            const episodiosRows = await db.all(
                `
                SELECT e.*
                FROM episodio e
                INNER JOIN temporada t ON t.id_tmdb_temporada = e.id_tmdb_temporada
                WHERE t.id_tmdb_serie = ?
                ORDER BY t.numero_temporada ASC, e.numero_episodio ASC
                `,
                [idTmdb]
            );

            const episodiosPorTemporada = new Map();
            for (const ep of episodiosRows) {
                if (!episodiosPorTemporada.has(ep.id_tmdb_temporada)) {
                    episodiosPorTemporada.set(ep.id_tmdb_temporada, []);
                }
                episodiosPorTemporada.get(ep.id_tmdb_temporada).push({
                    ...ep,
                    assistido: Boolean(ep.assistido)
                });
            }

            temporadas = temporadasRows.map((temp) => ({
                ...temp,
                episodios: episodiosPorTemporada.get(temp.id_tmdb_temporada) || []
            }));
        }

        return res.json({
            ...conteudo,
            favorito: Boolean(conteudo.favorito),
            generos: generosRows.map((g) => g.nome_genero),
            avaliacoes: Array.from(avaliacoesMap.values()),
            temporadas
        });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao obter detalhes do conteúdo.', detalhe: error.message });
    }
}

export async function salvarConteudo(req, res) {
    const db = await getDb();
    let transactionStarted = false;

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
        if (!titulo || typeof titulo !== 'string') {
            return res.status(400).json({ erro: 'Campo "titulo" é obrigatório.' });
        }
        if (status_biblioteca !== null && !STATUS_VALIDOS.includes(status_biblioteca)) {
            return res.status(400).json({ erro: 'Campo "status_biblioteca" inválido.' });
        }

        const existente = await db.get('SELECT id_tmdb FROM conteudo WHERE id_tmdb = ?', [idTmdb]);
        if (existente) {
            return res.status(409).json({ erro: 'Conteúdo já está salvo na biblioteca.' });
        }

        await db.exec('BEGIN TRANSACTION;');
        transactionStarted = true;

        await db.run(
            `
            INSERT INTO conteudo (id_tmdb, tipo, titulo, poster_url, sinopse, favorito, status_biblioteca)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [idTmdb, tipo, titulo.trim(), poster_url, sinopse, favorito ? 1 : 0, status_biblioteca]
        );

        if (tipo === 'filme') {
            await db.run(
                'INSERT INTO filme (id_tmdb, data_lancamento, duracao) VALUES (?, ?, ?)',
                [idTmdb, data_lancamento, duracao]
            );
        } else {
            await db.run(
                'INSERT INTO serie (id_tmdb, status_producao) VALUES (?, ?)',
                [idTmdb, status_producao]
            );

            for (const temp of temporadas) {
                if (!temp.id_tmdb_temporada && temp.id_tmdb_temporada !== 0) continue;
                await db.run(
                    `
                    INSERT OR IGNORE INTO temporada (id_tmdb_temporada, id_tmdb_serie, numero_temporada, nome)
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        temp.id_tmdb_temporada,
                        idTmdb,
                        temp.numero_temporada ?? 0,
                        temp.nome || `Temporada ${temp.numero_temporada ?? 0}`
                    ]
                );

                for (const ep of temp.episodios || []) {
                    if (!ep.id_tmdb_episodio) continue;
                    await db.run(
                        `
                        INSERT OR IGNORE INTO episodio (
                            id_tmdb_episodio, id_tmdb_temporada, numero_episodio,
                            titulo, sinopse, duracao, data_exibicao, assistido
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            ep.id_tmdb_episodio,
                            temp.id_tmdb_temporada,
                            ep.numero_episodio ?? 0,
                            ep.titulo || null,
                            ep.sinopse || null,
                            ep.duracao || null,
                            ep.data_exibicao || null,
                            ep.assistido ? 1 : 0
                        ]
                    );
                }
            }
        }

        for (const genero of generos) {
            if (typeof genero === 'string' && genero.trim()) {
                await db.run(
                    'INSERT OR IGNORE INTO conteudo_generos (id_tmdb, nome_genero) VALUES (?, ?)',
                    [idTmdb, genero.trim()]
                );
            }
        }

        await db.exec('COMMIT;');
        transactionStarted = false;

        return res.status(201).json({ mensagem: 'Conteúdo salvo na biblioteca.', id_tmdb: idTmdb });
    } catch (error) {
        if (transactionStarted) {
            await db.exec('ROLLBACK;');
        }
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
        const updates = [];
        const params = [];

        if (status_biblioteca !== undefined) {
            if (status_biblioteca !== null && !STATUS_VALIDOS.includes(status_biblioteca)) {
                return res.status(400).json({ erro: 'Campo "status_biblioteca" inválido.' });
            }
            updates.push('status_biblioteca = ?');
            params.push(status_biblioteca);
        }

        if (favorito !== undefined) {
            updates.push('favorito = ?');
            params.push(favorito ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ erro: 'Nenhum campo válido enviado para atualização.' });
        }

        params.push(idTmdb);

        const db = await getDb();
        const result = await db.run(
            `UPDATE conteudo SET ${updates.join(', ')} WHERE id_tmdb = ?`,
            params
        );

        if (result.changes === 0) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        const atualizado = await db.get('SELECT * FROM conteudo WHERE id_tmdb = ?', [idTmdb]);
        return res.json({ ...atualizado, favorito: Boolean(atualizado.favorito) });
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

        const db = await getDb();
        const result = await db.run('DELETE FROM conteudo WHERE id_tmdb = ?', [idTmdb]);

        if (result.changes === 0) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        return res.json({ mensagem: 'Conteúdo removido da biblioteca.', id_tmdb: idTmdb });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao remover conteúdo.', detalhe: error.message });
    }
}

export async function adicionarAvaliacao(req, res) {
    const db = await getDb();
    let transactionStarted = false;

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

        const conteudo = await db.get('SELECT id_tmdb FROM conteudo WHERE id_tmdb = ?', [idTmdb]);
        if (!conteudo) {
            return res.status(404).json({ erro: 'Conteúdo não encontrado na biblioteca.' });
        }

        await db.exec('BEGIN TRANSACTION;');
        transactionStarted = true;

        const insertAvaliacao = await db.run(
            'INSERT INTO avaliacao (id_tmdb, nota_pessoal) VALUES (?, ?)',
            [idTmdb, nota]
        );

        const idAvaliacao = insertAvaliacao.lastID;

        if (typeof texto_comentario === 'string' && texto_comentario.trim()) {
            await db.run(
                'INSERT INTO avaliacao_comentario (id_avaliacao, texto_comentario) VALUES (?, ?)',
                [idAvaliacao, texto_comentario.trim()]
            );
        }

        await db.exec('COMMIT;');
        transactionStarted = false;

        return res.status(201).json({
            mensagem: 'Avaliação registrada com sucesso.',
            id_avaliacao: idAvaliacao
        });
    } catch (error) {
        if (transactionStarted) {
            await db.exec('ROLLBACK;');
        }
        return res.status(500).json({ erro: 'Erro ao registrar avaliação.', detalhe: error.message });
    }
}

export async function removerAvaliacao(req, res) {
    try {
        const idAvaliacao = parsePositiveInt(req.params.idAvaliacao);
        if (!idAvaliacao) {
            return res.status(400).json({ erro: 'ID da avaliação inválido.' });
        }

        const db = await getDb();
        const result = await db.run('DELETE FROM avaliacao WHERE id_avaliacao = ?', [idAvaliacao]);

        if (result.changes === 0) {
            return res.status(404).json({ erro: 'Avaliação não encontrada.' });
        }

        return res.json({ mensagem: 'Avaliação removida com sucesso.', id_avaliacao: idAvaliacao });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao remover avaliação.', detalhe: error.message });
    }
}

export async function salvarTemporada(req, res) {
    const db = await getDb();
    let transactionStarted = false;

    try {
        const idTmdbSerie = parsePositiveInt(req.params.id);
        if (!idTmdbSerie) {
            return res.status(400).json({ erro: 'ID da série inválido.' });
        }

        const serie = await db.get('SELECT id_tmdb FROM serie WHERE id_tmdb = ?', [idTmdbSerie]);
        if (!serie) {
            return res.status(404).json({ erro: 'Série não encontrada na biblioteca.' });
        }

        const { id_tmdb_temporada, numero_temporada, nome, episodios = [] } = req.body;
        const idTemporada = parsePositiveInt(id_tmdb_temporada);
        if (!idTemporada) {
            return res.status(400).json({ erro: 'Campo "id_tmdb_temporada" válido é obrigatório.' });
        }

        await db.exec('BEGIN TRANSACTION;');
        transactionStarted = true;

        await db.run(
            `
            INSERT OR IGNORE INTO temporada (id_tmdb_temporada, id_tmdb_serie, numero_temporada, nome)
            VALUES (?, ?, ?, ?)
            `,
            [idTemporada, idTmdbSerie, numero_temporada ?? 0, nome || `Temporada ${numero_temporada ?? 0}`]
        );

        for (const ep of episodios) {
            if (!ep.id_tmdb_episodio) continue;
            await db.run(
                `
                INSERT OR IGNORE INTO episodio (
                    id_tmdb_episodio, id_tmdb_temporada, numero_episodio,
                    titulo, sinopse, duracao, data_exibicao, assistido
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    ep.id_tmdb_episodio,
                    idTemporada,
                    ep.numero_episodio ?? 0,
                    ep.titulo || null,
                    ep.sinopse || null,
                    ep.duracao || null,
                    ep.data_exibicao || null,
                    ep.assistido ? 1 : 0
                ]
            );
        }

        await db.exec('COMMIT;');
        transactionStarted = false;

        return res.status(201).json({ mensagem: 'Temporada e episódios sincronizados.', id_tmdb_temporada: idTemporada });
    } catch (error) {
        if (transactionStarted) {
            await db.exec('ROLLBACK;');
        }
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

        const db = await getDb();
        const result = await db.run(
            'UPDATE episodio SET assistido = ? WHERE id_tmdb_episodio = ?',
            [assistido ? 1 : 0, idEpisodio]
        );

        if (result.changes === 0) {
            return res.status(404).json({ erro: 'Episódio não encontrado.' });
        }

        const episodio = await db.get('SELECT * FROM episodio WHERE id_tmdb_episodio = ?', [idEpisodio]);
        return res.json({ ...episodio, assistido: Boolean(episodio.assistido) });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao atualizar episódio.', detalhe: error.message });
    }
}
