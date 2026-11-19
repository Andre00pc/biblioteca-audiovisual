const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
}[m]));

const STATUS = {
    'Assistir Depois': ['Quero assistir', 'fila'],
    'Assistindo':      ['Assistindo', 'andamento'],
    'Concluído':       ['Assistido', 'ok'],
};

const PRODUCAO = {
    'Returning Series': 'Em andamento',
    'In Production': 'Em produção',
    'Ended': 'Finalizada',
    'Canceled': 'Cancelada',
};

function fmtDuracao(min) {
    if (!min) return '';
    return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min} min`;
}

const SESSOES_INICIAIS = 2;
const SESSOES_POR_CLIQUE = 3;

export function anos(c) {
    return c.data_lancamento ? c.data_lancamento.slice(0, 4) : '–';
}

export function fmtData(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function posterStyle(c) {
    if (c.poster_url) return `background-image:url('${esc(c.poster_url)}')`;
    return 'background-color:var(--surface)';
}

export function cardHTML(c) {
    const [label, cls] = STATUS[c.status_biblioteca];
    return `
    
    <article class="card" data-href="#detalhe/${c.id_tmdb}">
      <div class="poster" style="${posterStyle(c)}">
        ${c.poster_url ? '' : `<div class="poster-fallback">${esc(c.titulo)}</div>`}
        <button class="fav-btn ${c.favorito ? 'on' : ''}" data-fav="${c.id_tmdb}" aria-label="Favoritar ${esc(c.titulo)}">
          ${c.favorito ? '♥' : '♡'}
        </button>
        <div class="poster-meta">
          <span class="badge ${cls}">${label}</span>
          ${c.nota_pessoal ? `<span class="nota">★ ${c.nota_pessoal}</span>` : ''}
        </div>
      </div>
      <h3>${esc(c.titulo)}</h3>
      <p>${c.tipo === 'filme' ? 'Filme' : 'Série'} · ${anos(c)}</p>
    </article>`;
}

export function statHTML(icone, cor, valor, rotulo) {
    return `
    <div class="stat" style="--c:${cor}">
      <div class="stat-icon">${icone}</div>
      <strong>${valor}</strong>
      <span>${rotulo}</span>
    </div>`;
}

export function sessaoHTML(s, c) {
    return `
    <div class="sessao" data-href="#detalhe/${c.id_tmdb}">
      <div class="sessao-thumb" style="${posterStyle(c)}"></div>
      <div class="sessao-info">
        <h3>${esc(c.titulo)}</h3>
        <p>${fmtData(s.data)}${s.comentarios?.[0] ? ` · “${esc(s.comentarios[0])}”` : ''}</p>
      </div>
      ${c.nota_pessoal != null ? `<span class="nota">★ ${c.nota_pessoal}</span>` : ''}
    </div>`;
}

export function resultadoHTML(r) {
    return `
    <button type="button" class="resultado" data-resultado="${r.id_tmdb}">
      <div class="resultado-thumb" style="${posterStyle(r)}"></div>
      <div>
        <h3>${esc(r.titulo)}</h3>
        <p>${r.tipo === 'filme' ? 'Filme' : 'Série'} · ${anos(r)}</p>
      </div>
    </button>`;
}

export function escolhidoHTML(d) {
    const meta = [
        d.tipo === 'filme' ? 'Filme' : 'Série',
        anos(d),
        d.duracao ? `${d.duracao} min` : null,
    ].filter(Boolean).join(' · ');

    return `
    <div class="escolhido-thumb" style="${posterStyle(d)}"></div>
    <div>
      <h3>${esc(d.titulo)}</h3>
      <p>${esc(meta)}</p>
      <p>${esc((d.generos || []).join(', '))}</p>
      <p class="escolhido-sinopse">${esc(d.sinopse || 'Sem sinopse disponível.')}</p>
    </div>`;
}

export function filtrosHTML(mostrarTipo, generos, mostrarFavoritos = true) {
    const chip = (atributo, valor, texto, ativo) =>
        `<button type="button" class="chip ${ativo ? 'active' : ''}" ${atributo}="${valor}">${texto}</button>`;

    return `
    <div class="filtros">

      <div class="filtros-linha filtros-chips">
        <div class="campo filtros-busca">
          <input id="f-busca" type="search" placeholder="Buscar por título…" autocomplete="off" aria-label="Buscar por título">
        </div>

        <select id="f-genero" aria-label="Gênero">
          <option value="">Todos os gêneros</option>
          ${generos.map(g => `<option>${esc(g)}</option>`).join('')}
        </select>

        <select id="f-ordem" aria-label="Ordenar por">
          <option value="recentes">Mais recentes</option>
          <option value="titulo">Título (A–Z)</option>
          <option value="ano">Ano</option>
          <option value="nota">Minha nota</option>
        </select>

        <div class="alternar">
          <button type="button" class="alternar-btn active" data-f-visao="grade" aria-label="Ver em grade">▦</button>
          <button type="button" class="alternar-btn" data-f-visao="lista" aria-label="Ver em lista">☰</button>
        </div>
      </div>

      <div class="filtros-linha">
        ${mostrarTipo ? `
          ${chip('data-f-tipo', 'todos', 'Tudo', true)}
          ${chip('data-f-tipo', 'filme', 'Filmes', false)}
          ${chip('data-f-tipo', 'serie', 'Séries', false)}
          <span class="filtros-divisor"></span>` : ''}
        ${chip('data-f-status', 'todos', 'Todos os status', true)}
        ${chip('data-f-status', 'Assistir Depois', 'Quero assistir', false)}
        ${chip('data-f-status', 'Assistindo', 'Assistindo', false)}
        ${chip('data-f-status', 'Concluído', 'Assistido', false)}
        ${mostrarFavoritos ? chip('data-f-status', 'favoritos', '<span class="chip-icone">♡</span>Favoritos', false) : ''}
      </div>

    </div>`;
}

export function linhaHTML(c) {
    const [label, cls] = STATUS[c.status_biblioteca];
    return `
    <div class="sessao" data-href="#detalhe/${c.id_tmdb}">
      <div class="sessao-thumb" style="${posterStyle(c)}"></div>
      <div class="sessao-info">
        <h3>${esc(c.titulo)}</h3>
        <p>${c.tipo === 'filme' ? 'Filme' : 'Série'} · ${anos(c)}</p>
      </div>
      <span class="badge ${cls}">${label}</span>
      ${c.nota_pessoal ? `<span class="nota">★ ${c.nota_pessoal}</span>` : ''}
      <button type="button" class="btn-texto ${c.favorito ? 'on' : ''}" data-fav="${c.id_tmdb}" aria-label="Favoritar ${esc(c.titulo)}">
        ${c.favorito ? '♥' : '♡'}
      </button>
    </div>`;
}

export function filaHTML(c) {
    const meta = [
        c.tipo === 'filme' ? 'Filme' : 'Série',
        anos(c),
        (c.generos || []).join(', '),
    ].filter(Boolean).join(' · ');

    return `
    <div class="sessao fila-item" data-href="#detalhe/${c.id_tmdb}">
      <div class="sessao-thumb" style="${posterStyle(c)}"></div>
      <div class="sessao-info">
        <h3>${esc(c.titulo)}</h3>
        <p>${esc(meta)}</p>
        <span class="badge fila">Quero assistir</span>
      </div>
      <div class="fila-acoes">
        <button type="button" class="btn btn-pequeno btn-escuro" data-id="${c.id_tmdb}" data-mudar-estado="Assistindo">▷ Assistindo</button>
        <button type="button" class="btn btn-pequeno" data-id="${c.id_tmdb}" data-mudar-estado="Concluído">✓ Assistido</button>
        <button type="button" class="btn-texto" data-remover="${c.id_tmdb}" aria-label="Remover ${esc(c.titulo)}">×</button>
      </div>
    </div>`;
}

export function reassistidosHTML(lista) {
    if (!lista.length) return '';
    return `
    <div class="section-head">
      <h2><span class="icone-secao">⇄</span>Mais reassistidos</h2>
    </div>
    <div class="reassistidos">
      ${lista.map(({ conteudo: c, vezes }, i) => `
        <article class="card" data-href="#detalhe/${c.id_tmdb}">
          <div class="poster" style="${posterStyle(c)}">
            ${c.poster_url ? '' : `<div class="poster-fallback">${esc(c.titulo)}</div>`}
            <span class="badge badge-rank">#${i + 1}</span>
          </div>
          <h3>${esc(c.titulo)}</h3>
          <p>${vezes} vezes</p>
        </article>`).join('')}
    </div>`;
}

export function sessaoHistoricoHTML(s, c) {
    return `
    <div class="sessao hist-item">
      <div class="sessao-thumb" style="${posterStyle(c)}"></div>
      <div class="sessao-info">
        <h3>${esc(c.titulo)}</h3>
        <p>${fmtData(s.data)}</p>
        ${(s.comentarios || []).map(t => `<p>“${esc(t)}”</p>`).join('')}
      </div>
      ${c.nota_pessoal != null ? `<span class="nota">★ ${c.nota_pessoal}</span>` : ''}
      <button type="button" class="btn-texto" data-remover-sessao="${s.id_sessao}" aria-label="Excluir sessão">×</button>
    </div>`;
}


export function mesesHTML(sessoes, conteudos) {
    const grupos = [];

    for (const s of sessoes) {
        const mes = new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        let grupo = grupos.find(g => g.mes === mes);
        if (!grupo) {
            grupo = { mes, itens: [] };
            grupos.push(grupo);
        }
        grupo.itens.push(s);
    }

    return grupos.map(g => `
      <h3 class="mes">${g.mes}</h3>
      <div class="mes-grupo">
        ${g.itens.map(s => sessaoHistoricoHTML(s, conteudos.find(c => c.id_tmdb === s.id_tmdb))).join('')}
      </div>`).join('');
}

function sessaoDetalheHTML(s, oculta = false) {
    return `
    <div class="sessao sessao-det" ${oculta ? 'hidden' : ''}>
      <div class="sessao-det-topo">
        <strong>${fmtData(s.data)}</strong>
        <span class="sessao-det-acoes">
          <button type="button" class="btn-texto" data-comentar="${s.id_sessao}">+ Comentar</button>
          <button type="button" class="btn-texto" data-remover-sessao="${s.id_sessao}" aria-label="Excluir sessão">×</button>
        </span>
      </div>
      ${(s.comentarios || []).map(t => `<p class="comentario">“${esc(t)}”</p>`).join('')}
    </div>`;
}

function temporadasHTML(c) {
    const lista = c.temporadas || [];
    return `
    <section class="painel painel-largo">
      <h2 class="painel-titulo">Temporadas</h2>
      ${lista.map(t => `
        <div>
          <button type="button" class="temporada-cab" data-serie="${c.id_tmdb}" data-temporada="${t.numero_temporada}" aria-expanded="false">
            <strong>${esc(t.nome)}</strong>
            <span>${t.total_episodios} ${t.total_episodios === 1 ? 'episódio' : 'episódios'}</span>
            <span class="seta">⌄</span>
          </button>
          <div class="episodios" hidden></div>
        </div>`).join('') || '<p class="painel-sub">Sem temporadas disponíveis.</p>'}
    </section>`;
}

export function episodiosHTML(lista) {
    return lista.map(ep => `
    <div class="episodio">
      <span class="episodio-num">${ep.numero_episodio}</span>
      <span class="episodio-titulo">${esc(ep.titulo)}</span>
      <span class="episodio-min">${ep.duracao ? `${ep.duracao} min` : ''}</span>
    </div>`).join('') || '<p class="painel-sub">Nenhum episódio disponível.</p>';
}

export function detalheHTML(c, sessoes) {
    const meta = (c.tipo === 'filme'
            ? [anos(c), fmtDuracao(c.duracao)]
            : [
                `${anos(c)}–`,
                PRODUCAO[c.status_producao] || c.status_producao,
                c.temporadas?.length ? `${c.temporadas.length} ${c.temporadas.length === 1 ? 'temporada' : 'temporadas'}` : null,
            ]
    ).filter(Boolean).join(' · ');

    const opcoes = Object.entries(STATUS).map(([valor, [rotulo]]) =>
        `<option value="${valor}" ${valor === c.status_biblioteca ? 'selected' : ''}>${rotulo}</option>`
    ).join('');

    return `
    <section class="hero detalhe-topo">
      <div class="poster detalhe-poster" style="${posterStyle(c)}">
        ${c.poster_url ? '' : `<div class="poster-fallback">${esc(c.titulo)}</div>`}
        <button class="fav-btn ${c.favorito ? 'on' : ''}" data-fav="${c.id_tmdb}" aria-label="Favoritar ${esc(c.titulo)}">
          ${c.favorito ? '♥' : '♡'}
        </button>
      </div>

      <div class="detalhe-info">
        <small>${c.tipo === 'filme' ? 'Filme' : 'Série'}</small>
        <h1>${esc(c.titulo)}</h1>
        <p>${esc(meta)}</p>
        <p class="detalhe-sinopse">${esc(c.sinopse || 'Sem sinopse disponível.')}</p>

        <div class="filtros-linha filtros-chips">
          ${(c.generos || []).map(g => `<span class="chip">${esc(g)}</span>`).join('')}
        </div>

        <div class="detalhe-acoes">
          <select data-estado-select="${c.id_tmdb}" aria-label="Estado">${opcoes}</select>
          <button type="button" class="btn btn-pequeno btn-degrade" data-registrar="${c.id_tmdb}">Registrar assistência</button>
          <button type="button" class="btn-texto btn-perigo" data-excluir="${c.id_tmdb}" aria-label="Excluir da biblioteca">×</button>
        </div>
      </div>
    </section>

    <div class="painel-grade">
      <section class="painel">
        <div class="section-head">
          <h2>Minha avaliação</h2>
          ${c.nota_pessoal != null ? `<button type="button" class="btn-texto btn-pequeno" data-avaliar="${c.id_tmdb}">Editar</button>` : ''}
        </div>
        ${c.nota_pessoal != null
        ? `<p class="painel-nota">★ <strong>${c.nota_pessoal}</strong><span>/10</span></p>`
        : `<button type="button" class="vazio vazio-acao" data-avaliar="${c.id_tmdb}">☆ Avaliar conteúdo</button>`}
      </section>

      <section class="painel">
        <h2 class="painel-titulo">Minhas sessões</h2>
        <p class="painel-sub">Assistido ${sessoes.length} ${sessoes.length === 1 ? 'vez' : 'vezes'}.</p>
        ${sessoes.length
        ? `<div class="lista">${sessoes.map((s, i) => sessaoDetalheHTML(s, i >= SESSOES_INICIAIS)).join('')}</div>
               ${sessoes.length > SESSOES_INICIAIS
            ? `<button type="button" class="btn-texto ver-mais" data-ver-mais data-passo="${SESSOES_POR_CLIQUE}">Ver mais (${sessoes.length - SESSOES_INICIAIS})</button>`
            : ''}`
        : '<p class="painel-sub">Nenhuma sessão registrada ainda.</p>'}
      </section>
    </div>

    ${c.tipo === 'serie' ? temporadasHTML(c) : ''}`;
}

export const vazio = msg => `<div class="vazio">${esc(msg)}</div>`;