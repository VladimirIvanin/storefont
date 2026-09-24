/* Demo page logic — a classic script (no modules) so the page works from
 * file:// as well. Data comes from the generated fonts/data.js. */
(function () {
  const { firstCodepoint, sets } = window.insalesIcons;
  const icons = sets[0].icons; // every set ships the same canonical list

  const state = {
    set: sets[0].key,
    query: '',
    size: 32,
  };

  const codepointHex = (name) => (firstCodepoint + icons.indexOf(name)).toString(16).toUpperCase();

  const grid = document.querySelector('#grid');
  const empty = document.querySelector('#empty');
  const count = document.querySelector('#count');
  const search = document.querySelector('#search');
  const size = document.querySelector('#size');
  const switcher = document.querySelector('.set-switcher');
  const toast = document.querySelector('#toast');
  const credits = document.querySelector('#credits');
  const snippetCss = document.querySelector('#snippet-css');

  /* The generated stylesheets all declare the same font-family and class
   * names, so exactly one may be active at a time. */
  function loadStylesheet(setKey) {
    let link = document.querySelector('#font-css');
    if (!link) {
      link = document.createElement('link');
      link.id = 'font-css';
      link.rel = 'stylesheet';
      document.head.append(link);
    }
    link.href = `fonts/icons-${setKey}/style.css`;
  }

  function buildSwitcher() {
    for (const set of sets) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'set-button';
      button.setAttribute('role', 'tab');
      button.dataset.key = set.key;
      button.innerHTML = `<strong>${set.label}</strong><small>${set.package}</small>`;
      button.addEventListener('click', () => selectSet(set.key));
      switcher.append(button);
    }
  }

  function renderGrid() {
    const fragment = document.createDocumentFragment();
    const query = state.query.trim().toLowerCase();
    let shown = 0;

    for (const name of icons) {
      if (query && !name.includes(query)) continue;
      shown += 1;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.name = name;
      card.title = `Copy .icon-${name}`;
      card.innerHTML = `
        <span class="glyph icon-${name}"></span>
        <span class="name">${name}</span>
        <span class="code">\\${codepointHex(name)}</span>`;
      card.addEventListener('click', () => copyClassName(name));
      fragment.append(card);
    }

    grid.replaceChildren(fragment);
    empty.hidden = shown > 0;
    count.value = `${shown} / ${icons.length}`;
  }

  function selectSet(setKey) {
    state.set = setKey;
    loadStylesheet(setKey);
    for (const button of switcher.querySelectorAll('.set-button')) {
      button.setAttribute('aria-selected', String(button.dataset.key === setKey));
    }
    snippetCss.textContent = `<link rel="stylesheet" href="…/fonts/icons-${setKey}/style.css">`;
  }

  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  async function copyClassName(name) {
    const text = `.icon-${name}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${text}`);
    } catch {
      // Clipboard API is unavailable on non-secure origins — fall back silently.
      const area = document.createElement('textarea');
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      showToast(`Copied ${text}`);
    }
  }

  search.addEventListener('input', () => {
    state.query = search.value;
    renderGrid();
  });

  size.addEventListener('input', () => {
    state.size = Number(size.value);
    grid.style.setProperty('--glyph-size', `${state.size}px`);
  });

  credits.innerHTML = sets
    .map((set) => `${set.label} Icons <span class="license">${set.license}</span>`)
    .join(' · ')
    .concat(' — thank you!');

  buildSwitcher();
  selectSet(state.set);
  renderGrid();
})();
