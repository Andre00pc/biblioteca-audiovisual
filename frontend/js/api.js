const DB = {
    conteudos: [
        {
            id_tmdb: 1,
            tipo: 'filme',
            titulo: 'Título de Teste 1',
            ano_inicio: 2010,
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
};