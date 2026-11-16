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
    <article class="card">
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
    <div class="sessao">
      <div class="sessao-thumb" style="${posterStyle(c)}"></div>
      <div class="sessao-info">
        <h3>${esc(c.titulo)}</h3>
        <p>${fmtData(s.data)}${s.comentario ? ` · “${esc(s.comentario)}”` : ''}</p>
      </div>
      ${s.nota ? `<span class="nota">★ ${s.nota}</span>` : ''}
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

export function filtrosHTML(mostrarTipo, generos) {
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
        ${chip('data-f-status', 'favoritos', '<span class="chip-icone">♡</span>Favoritos', false)}
      </div>

    </div>`;
}

export function linhaHTML(c) {
    const [label, cls] = STATUS[c.status_biblioteca];
    return `
    <div class="sessao">
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
    <div class="sessao fila-item">
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

export const vazio = msg => `<div class="vazio">${esc(msg)}</div>`;