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
    },
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
    sessoes: [],
};

export const api = {
    async listarConteudos() {
        return DB.conteudos;
    },

    async listarSessoes() {
        return [...DB.sessoes].sort((a, b) => b.data.localeCompare(a.data));
    },

    async alternarFavorito(id) {
        const c = DB.conteudos.find(x => x.id_tmdb === id);
        c.favorito = !c.favorito;
        return c;
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
};