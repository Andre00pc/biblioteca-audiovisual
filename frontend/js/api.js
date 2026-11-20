//  teste que imita o TMDB (TEMPORÁRIO)
// todo: dps apagar esse bloco e trocar buscarTmdb e detalhes por fetch
const CATALOGO_TMDB = [
    {
        id_tmdb: 101,
        tipo: 'filme',
        titulo: 'Filme de Teste',
        poster_url: null,
        sinopse: 'Sinopse de teste do primeiro filme.',
        data_lancamento: '2010-07-16',
        nota_tmdb: 8.4,
        generos: ['Ficção científica', 'Ação'],
        duracao: 148,
    },
    {
        id_tmdb: 102,
        tipo: 'filme',
        titulo: 'Outro Filme de Teste',
        poster_url: null,
        sinopse: 'Sinopse de teste do segundo filme.',
        data_lancamento: '2021-10-22',
        nota_tmdb: 7.9,
        generos: ['Drama'],
        duracao: 155,
    },
    {
        id_tmdb: 201,
        tipo: 'serie',
        titulo: 'Série de Teste',
        poster_url: null,
        sinopse: 'Sinopse de teste da série.',
        data_lancamento: '2017-12-01',
        nota_tmdb: 8.7,
        generos: ['Drama', 'Suspense'],
        status_producao: 'Ended',
        temporadas: [
            { id_tmdb_temporada: 2011, id_tmdb_serie: 201, numero_temporada: 1, nome: 'Temporada 1', total_episodios: 3 },
            { id_tmdb_temporada: 2012, id_tmdb_serie: 201, numero_temporada: 2, nome: 'Temporada 2', total_episodios: 2 },
        ],
    },
];

const EPISODIOS_TESTE = [
    { id_tmdb_episodio: 1, numero_episodio: 1, titulo: 'Episódio de teste 1', sinopse: '', duracao: 60, data_exibicao: '2017-12-01' },
    { id_tmdb_episodio: 2, numero_episodio: 2, titulo: 'Episódio de teste 2', sinopse: '', duracao: 55, data_exibicao: '2017-12-08' },
    { id_tmdb_episodio: 3, numero_episodio: 3, titulo: 'Episódio de teste 3', sinopse: '', duracao: 58, data_exibicao: '2017-12-15' },
];

const DB = {
    conteudos: [
        {
            id_tmdb: 1,
            tipo: 'filme',
            titulo: 'Título de Teste 1',
            data_lancamento: '2010-07-16',
            sinopse: 'Texto de teste da sinopse.',
            generos: ['Ficção científica', 'Ação'],
            duracao: 148,
            nota_tmdb: 8.4,
            status_biblioteca: 'Concluído',
            favorito: true,
            nota_pessoal: 9,
            poster_url: null,
            adicionado: 3,
        },
    ],

    sessoes: [
        { id_sessao: 1, id_tmdb: 1, data: '2026-10-18', comentarios: ['Comentário de teste.', 'Outro comentário da mesma sessão.'] },
        { id_sessao: 2, id_tmdb: 1, data: '2026-09-22', comentarios: [] },
        { id_sessao: 3, id_tmdb: 1, data: '2026-07-02', comentarios: [] },
    ],
};

export const api = {
    async listarConteudos() {
        return DB.conteudos;
    },

    async listarSessoes() {
        return [...DB.sessoes].sort((a, b) => b.data.localeCompare(a.data));
    },

    async buscarConteudo(id) {
        return DB.conteudos.find(x => x.id_tmdb === id) || null;
    },

    async alternarFavorito(id) {
        const c = DB.conteudos.find(x => x.id_tmdb === id);
        c.favorito = !c.favorito;
        return c;
    },

    async mudarEstado(id, estado) {
        const c = DB.conteudos.find(x => x.id_tmdb === id);
        c.status_biblioteca = estado;
        return c;
    },

    async removerConteudo(id) {
        const i = DB.conteudos.findIndex(x => x.id_tmdb === id);
        if (i >= 0) DB.conteudos.splice(i, 1);
        DB.sessoes = DB.sessoes.filter(s => s.id_tmdb !== id);
    },

    async avaliarConteudo(id, nota) {
        const c = DB.conteudos.find(x => x.id_tmdb === id);
        c.nota_pessoal = nota;
        return c;
    },

    async registrarSessao(id, { data, comentario }) {
        const id_sessao = Math.max(0, ...DB.sessoes.map(s => s.id_sessao)) + 1;
        DB.sessoes.push({
            id_sessao,
            id_tmdb: id,
            data,
            comentarios: comentario ? [comentario] : [],
        });
    },

    async adicionarComentario(idSessao, texto) {
        const s = DB.sessoes.find(x => x.id_sessao === idSessao);
        if (s) s.comentarios.push(texto);
    },

    async removerSessao(id) {
        DB.sessoes = DB.sessoes.filter(s => s.id_sessao !== id);
    },

    async adicionarConteudo(detalhes, estado) {
        const jaExiste = DB.conteudos.some(c => c.tipo === detalhes.tipo && c.id_tmdb === detalhes.id_tmdb);
        if (jaExiste) return null;

        const novo = {
            ...detalhes,
            status_biblioteca: estado.status_biblioteca,
            favorito: estado.favorito,
            nota_pessoal: null,
            adicionado: Date.now(),
        };
        DB.conteudos.push(novo);
        return novo;
    },

    async buscarTmdb(q, tipo) {
        const termo = q.trim().toLowerCase();
        const results = CATALOGO_TMDB
            .filter(c => c.tipo === tipo && c.titulo.toLowerCase().includes(termo))
            .map(({ id_tmdb, tipo, titulo, poster_url, sinopse, data_lancamento, nota_tmdb }) => ({
                id_tmdb, tipo, titulo, poster_url, sinopse, data_lancamento, nota_tmdb,
            }));
        return { results };
    },

    async detalhes(tipo, id) {
        return CATALOGO_TMDB.find(c => c.tipo === tipo && c.id_tmdb === id);
    },

    async temporada(idSerie, numero) {
        const total = numero === 1 ? 3 : 2;
        return { numero_temporada: numero, episodios: EPISODIOS_TESTE.slice(0, total) };
    },
};