import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../../database/database.sqlite');
const INIT_SQL_PATH = path.resolve(__dirname, '../../database/init.sql');

let dbInstance = null;

export async function initDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON;');

    const initSql = await fs.readFile(INIT_SQL_PATH, 'utf-8');
    await db.exec(initSql);

    dbInstance = db;
    return dbInstance;
}

export async function getDb() {
    if (!dbInstance) {
        return initDatabase();
    }
    return dbInstance;
}

export async function listarConteudosDb({ tipo, status, favorito, q } = {}) {
    const db = await getDb();

    const conditions = [];
    const params = [];

    if (tipo) {
        conditions.push('c.tipo = ?');
        params.push(tipo);
    }

    if (status) {
        conditions.push('c.status_biblioteca = ?');
        params.push(status);
    }

    if (favorito !== undefined) {
        conditions.push('c.favorito = ?');
        params.push(favorito ? 1 : 0);
    }

    if (q) {
        conditions.push('LOWER(c.titulo) LIKE LOWER(?)');
        params.push(`%${q}%`);
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

    return itens.map((item) => ({
        ...item,
        favorito: Boolean(item.favorito),
        generos: generosPorItem.get(item.id_tmdb) || []
    }));
}

export async function obterEstatisticasDb() {
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

    const porGenero = await db.all(`
        SELECT
            cg.nome_genero AS genero,
            COUNT(*) AS quantidade
        FROM conteudo_generos cg
        INNER JOIN conteudo c ON c.id_tmdb = cg.id_tmdb
        GROUP BY cg.nome_genero
        ORDER BY quantidade DESC, cg.nome_genero ASC
    `);

    const progressoSeries = await db.all(`
        SELECT
            c.id_tmdb,
            c.titulo,
            COUNT(e.id_tmdb_episodio) AS total_episodios,
            SUM(CASE WHEN e.assistido = 1 THEN 1 ELSE 0 END) AS episodios_assistidos
        FROM conteudo c
        INNER JOIN temporada t ON t.id_tmdb_serie = c.id_tmdb
        INNER JOIN episodio e ON e.id_tmdb_temporada = t.id_tmdb_temporada
        GROUP BY c.id_tmdb, c.titulo
        ORDER BY c.titulo ASC
    `);

    return {
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
        media_notas: mediaNotas?.media_notas ?? null,
        por_genero: porGenero,
        progresso_series: progressoSeries
    };
}

export async function obterConteudoPorIdDb(idTmdb) {
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
        return null;
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

    return {
        ...conteudo,
        favorito: Boolean(conteudo.favorito),
        generos: generosRows.map((g) => g.nome_genero),
        avaliacoes: Array.from(avaliacoesMap.values()),
        temporadas
    };
}

export async function existeConteudoDb(idTmdb) {
    const db = await getDb();
    const row = await db.get('SELECT id_tmdb FROM conteudo WHERE id_tmdb = ?', [idTmdb]);
    return Boolean(row);
}

export async function existeSerieDb(idTmdb) {
    const db = await getDb();
    const row = await db.get('SELECT id_tmdb FROM serie WHERE id_tmdb = ?', [idTmdb]);
    return Boolean(row);
}

export async function salvarConteudoDb({
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
}) {
    const db = await getDb();
    let transactionStarted = false;

    try {
        await db.exec('BEGIN TRANSACTION;');
        transactionStarted = true;

        await db.run(
            `
            INSERT INTO conteudo (id_tmdb, tipo, titulo, poster_url, sinopse, favorito, status_biblioteca)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [id_tmdb, tipo, titulo.trim(), poster_url, sinopse, favorito ? 1 : 0, status_biblioteca]
        );

        if (tipo === 'filme') {
            await db.run(
                'INSERT INTO filme (id_tmdb, data_lancamento, duracao) VALUES (?, ?, ?)',
                [id_tmdb, data_lancamento, duracao]
            );
        } else {
            await db.run(
                'INSERT INTO serie (id_tmdb, status_producao) VALUES (?, ?)',
                [id_tmdb, status_producao]
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
                        id_tmdb,
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
                    [id_tmdb, genero.trim()]
                );
            }
        }

        await db.exec('COMMIT;');
        transactionStarted = false;
        return id_tmdb;
    } catch (error) {
        if (transactionStarted) {
            await db.exec('ROLLBACK;');
        }
        throw error;
    }
}

export async function atualizarConteudoDb(idTmdb, { status_biblioteca, favorito }) {
    const db = await getDb();
    const updates = [];
    const params = [];

    if (status_biblioteca !== undefined) {
        updates.push('status_biblioteca = ?');
        params.push(status_biblioteca);
    }

    if (favorito !== undefined) {
        updates.push('favorito = ?');
        params.push(favorito ? 1 : 0);
    }

    params.push(idTmdb);

    const result = await db.run(
        `UPDATE conteudo SET ${updates.join(', ')} WHERE id_tmdb = ?`,
        params
    );

    if (result.changes === 0) {
        return null;
    }

    const atualizado = await db.get('SELECT * FROM conteudo WHERE id_tmdb = ?', [idTmdb]);
    return { ...atualizado, favorito: Boolean(atualizado.favorito) };
}

export async function removerConteudoDb(idTmdb) {
    const db = await getDb();
    const result = await db.run('DELETE FROM conteudo WHERE id_tmdb = ?', [idTmdb]);
    return result.changes > 0;
}

export async function adicionarAvaliacaoDb(idTmdb, nota, textoComentario) {
    const db = await getDb();
    let transactionStarted = false;

    try {
        await db.exec('BEGIN TRANSACTION;');
        transactionStarted = true;

        const insertAvaliacao = await db.run(
            'INSERT INTO avaliacao (id_tmdb, nota_pessoal) VALUES (?, ?)',
            [idTmdb, nota]
        );

        const idAvaliacao = insertAvaliacao.lastID;

        if (typeof textoComentario === 'string' && textoComentario.trim()) {
            await db.run(
                'INSERT INTO avaliacao_comentario (id_avaliacao, texto_comentario) VALUES (?, ?)',
                [idAvaliacao, textoComentario.trim()]
            );
        }

        await db.exec('COMMIT;');
        transactionStarted = false;
        return idAvaliacao;
    } catch (error) {
        if (transactionStarted) {
            await db.exec('ROLLBACK;');
        }
        throw error;
    }
}

export async function removerAvaliacaoDb(idAvaliacao) {
    const db = await getDb();
    const result = await db.run('DELETE FROM avaliacao WHERE id_avaliacao = ?', [idAvaliacao]);
    return result.changes > 0;
}

export async function salvarTemporadaDb(idTmdbSerie, { id_tmdb_temporada, numero_temporada, nome, episodios = [] }) {
    const db = await getDb();
    let transactionStarted = false;

    try {
        await db.exec('BEGIN TRANSACTION;');
        transactionStarted = true;

        await db.run(
            `
            INSERT OR IGNORE INTO temporada (id_tmdb_temporada, id_tmdb_serie, numero_temporada, nome)
            VALUES (?, ?, ?, ?)
            `,
            [id_tmdb_temporada, idTmdbSerie, numero_temporada ?? 0, nome || `Temporada ${numero_temporada ?? 0}`]
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
                    id_tmdb_temporada,
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
        return id_tmdb_temporada;
    } catch (error) {
        if (transactionStarted) {
            await db.exec('ROLLBACK;');
        }
        throw error;
    }
}

export async function atualizarEpisodioDb(idEpisodio, assistido) {
    const db = await getDb();
    const result = await db.run(
        'UPDATE episodio SET assistido = ? WHERE id_tmdb_episodio = ?',
        [assistido ? 1 : 0, idEpisodio]
    );

    if (result.changes === 0) {
        return null;
    }

    const episodio = await db.get('SELECT * FROM episodio WHERE id_tmdb_episodio = ?', [idEpisodio]);
    return { ...episodio, assistido: Boolean(episodio.assistido) };
}
