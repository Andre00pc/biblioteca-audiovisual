# Biblioteca Audiovisual

Um sistema completo para gerenciamento pessoal de filmes e séries, totalmente integrado à API do TMDB.

## Sobre o Projeto
O projeto é uma Single Page Application (SPA) focada em rastrear o consumo audiovisual do usuário. Com um design moderno (Dark Mode nativo), o sistema permite buscar obras diretamente da base global do TMDB, salvá-las no banco de dados local e gerenciar o status de visualização, notas pessoais e favoritos.

## Funcionalidades

* **Busca Integrada:** Consulta em tempo real à API do TMDB para filmes e séries.
* **Dashboard Estatístico:** Resumo de obras assistidas, tempo consumido e notas médias.
* **Gestão de Séries e Filmes:** Controle detalhado cobrindo Temporadas e Episódios específicos.
* **Categorização:** Abas dedicadas para "Minha Coleção", "Assistir Depois" (Fila), "Histórico" e "Favoritos".
* **Sistema de Avaliação:** Registro de notas pessoais e resenhas críticas sobre as obras.
* **Interface SPA Dinâmica:** Navegação fluida sem recarregamento de página, construída puramente com HTML/CSS/JS.

## Tecnologias Utilizadas

**Frontend**
* **HTML5 & CSS3** (Utilizando CSS Grid, Flexbox e variáveis CSS para o Dark Mode)
* **JavaScript Puro (Vanilla JS)** (Para lógica de interface, requisições Fetch/SPA, sem frameworks)

**Backend**
* **Node.js com Express.js** (Roteamento e controle da API local)
* **Axios / Node Fetch** (Para comunicação backend-to-TMDB)
* **Dotenv** (Para proteção das chaves de API)

**Banco de Dados**
* **SQLite3** (Driver nativo, **SQL puro**, armazenado localmente para fácil distribuição na equipe)

## Equipe de Desenvolvimento

- André 
- Daniel
- João Pedro
- Júlia