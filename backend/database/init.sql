-- 1. Tabela Base: Conteúdo
CREATE TABLE IF NOT EXISTS conteudo (
    id_tmdb INTEGER PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('filme', 'serie')),
    titulo TEXT NOT NULL,
    poster_url TEXT,
    sinopse TEXT,
    favorito BOOLEAN DEFAULT 0,
    status_biblioteca TEXT CHECK (status_biblioteca IN ('assistido', 'assistindo', 'quero_assistir', 'abandonado'))
    );

-- 2. Especialização: Filme
CREATE TABLE IF NOT EXISTS filme (
    id_tmdb INTEGER PRIMARY KEY,
    data_lancamento DATE,
    duracao INTEGER,
    FOREIGN KEY (id_tmdb) REFERENCES conteudo(id_tmdb) ON DELETE CASCADE
    );

-- 3. Especialização: Série
CREATE TABLE IF NOT EXISTS serie (
    id_tmdb INTEGER PRIMARY KEY,
    status_producao TEXT,
    FOREIGN KEY (id_tmdb) REFERENCES conteudo(id_tmdb) ON DELETE CASCADE
    );

-- 4. Tabela de Gêneros
CREATE TABLE IF NOT EXISTS conteudo_generos (
    id_tmdb INTEGER,
    nome_genero TEXT NOT NULL,
    PRIMARY KEY (id_tmdb, nome_genero),
    FOREIGN KEY (id_tmdb) REFERENCES conteudo(id_tmdb) ON DELETE CASCADE
    );

-- 5. Tabela: Avaliação
CREATE TABLE IF NOT EXISTS avaliacao (
    id_avaliacao INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tmdb INTEGER NOT NULL,
    nota_pessoal REAL CHECK (nota_pessoal >= 0 AND nota_pessoal <= 10),
    data_avaliacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tmdb) REFERENCES conteudo(id_tmdb) ON DELETE CASCADE
    );

-- 6. Tabela: Comentários
CREATE TABLE IF NOT EXISTS avaliacao_comentario (
    id_comentario INTEGER PRIMARY KEY AUTOINCREMENT,
    id_avaliacao INTEGER NOT NULL,
    texto_comentario TEXT NOT NULL,
    FOREIGN KEY (id_avaliacao) REFERENCES avaliacao(id_avaliacao) ON DELETE CASCADE
    );

-- 7. Tabela: Temporada
CREATE TABLE IF NOT EXISTS temporada (
    id_tmdb_temporada INTEGER PRIMARY KEY,
    id_tmdb_serie INTEGER NOT NULL,
    numero_temporada INTEGER NOT NULL,
    nome TEXT,
    FOREIGN KEY (id_tmdb_serie) REFERENCES serie(id_tmdb) ON DELETE CASCADE
    );

-- 8. Tabela: Episódio
CREATE TABLE IF NOT EXISTS episodio (
    id_tmdb_episodio INTEGER PRIMARY KEY,
    id_tmdb_temporada INTEGER NOT NULL,
    numero_episodio INTEGER NOT NULL,
    titulo TEXT,
    sinopse TEXT,
    duracao INTEGER,
    data_exibicao DATE,
    assistido BOOLEAN DEFAULT 0,
    FOREIGN KEY (id_tmdb_temporada) REFERENCES temporada(id_tmdb_temporada) ON DELETE CASCADE
    );