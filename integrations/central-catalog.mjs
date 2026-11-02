// Gera dist/catalog.json para a Central de Ajuda do Stand Digital.
//
// Roda no fim do build (astro:build:done), lê o HTML já renderizado pelo
// Starlight e converte o conteúdo de cada artigo em HTML neutro, sem classes
// nem scripts do Starlight. A central aplica o próprio visual sobre esse HTML.
//
// Contrato de saída (schemaVersion 1):
// {
//   schemaVersion, generatedAt, site,
//   defaultLocale, locales: ['pt-BR'],
//   sections: [{ id, title, order }],
//   articles: [{
//     id, locale, translationKey, section, order, title, description, url,
//     html, text, headings: [{ id, text, level }], readingMinutes, hash
//   }]
// }
//
// Idiomas: hoje só existe pt-BR (locale raiz do Starlight). Quando o site ganhar
// traduções, cada versão entra como um artigo próprio, com seu `locale` e o mesmo
// `translationKey`; a Central escolhe a versão pelo idioma do usuário e cai em
// `defaultLocale` quando não houver tradução.
//
// Elementos do conteúdo:
//   <aside class="doc-callout doc-callout--note|tip|caution|danger">
//     <p class="doc-callout__title">…</p> …conteúdo… </aside>
//   <ol class="doc-steps">           (componente Steps)
//   <div class="doc-cards"><section class="doc-card">
//     <h3 class="doc-card__title">…</h3> …conteúdo… </section></div>
//   <section class="doc-tabs"><h3 class="doc-tabs__title">…</h3> …</section>
//   <pre class="doc-code" data-language="…"><code>…</code></pre>
//   <a data-doc-article="docs-stand/compartilhamento" data-doc-anchor="…">
//     link para outro artigo do catálogo; href guarda a URL pública como reserva
//
// Se a estrutura do Starlight mudar a ponto de o conteúdo não ser reconhecido,
// o build falha em vez de publicar um catálogo quebrado.

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fromHtml } from 'hast-util-from-html';
import { select, selectAll } from 'hast-util-select';
import { toHtml } from 'hast-util-to-html';
import { toText } from 'hast-util-to-text';

const SCHEMA_VERSION = 1;
const OUTPUT_FILE = 'catalog.json';
const WORDS_PER_MINUTE = 200;

const ASIDE_TYPES = new Set(['note', 'tip', 'caution', 'danger']);

const ALLOWED_TAGS = new Set([
	'p', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
	'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
	'hr', 'br', 'img', 'figure', 'figcaption', 'aside', 'div', 'section', 'span',
	'del', 'kbd', 'sup', 'sub', 'details', 'summary', 'mark',
]);

// Atributos mantidos por tag; `class` só sobrevive com prefixo doc-.
const ALLOWED_ATTRS = {
	'*': ['className'],
	a: ['href', 'target', 'rel', 'dataDocArticle', 'dataDocAnchor'],
	img: ['src', 'alt', 'width', 'height', 'loading'],
	h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
	th: ['align', 'colSpan', 'rowSpan'],
	td: ['align', 'colSpan', 'rowSpan'],
	ol: ['start'],
	pre: ['dataLanguage'],
};

// Remove o elemento inteiro (com filhos).
const DROP_SELECTORS = [
	'script', 'style', 'svg', 'template', 'button',
	'.sl-anchor-link', '.sr-only', '[data-pagefind-ignore]',
];

const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const textNode = (value) => ({ type: 'text', value });
const classesOf = (node) => (node.properties?.className || []).map(String);
const hasClass = (node, name) => classesOf(node).includes(name);

/** Mapeia o caminho de um link do sidebar ('/docs-stand/x/') para o id do artigo ('docs-stand/x'). */
function linkToId(link) {
	return link.replace(/^\/+/, '').replace(/\/+$/, '') || '';
}

/** Lê seções e ordem dos artigos a partir do sidebar do Starlight. */
function catalogEntriesFromSidebar(sidebar, sectionIds, exclude) {
	const excluded = new Set(exclude.map(linkToId));
	const sections = [];
	const articles = [];

	for (const group of sidebar) {
		if (!Array.isArray(group.items)) continue;
		const internal = group.items.filter((item) => typeof item.link === 'string' && item.link.startsWith('/'));
		const sectionId = internal.length ? linkToId(internal[0].link).split('/')[0] : '';
		if (!sectionIds.includes(sectionId)) continue;

		sections.push({ id: sectionId, title: group.label, order: sections.length });
		for (const item of internal) {
			const id = linkToId(item.link);
			if (excluded.has(id) || articles.some((a) => a.id === id)) continue;
			articles.push({ id, section: sectionId, order: articles.filter((a) => a.section === sectionId).length, label: item.label });
		}
	}

	for (const id of sectionIds) {
		if (!sections.some((s) => s.id === id)) throw new Error(`[central-catalog] seção "${id}" não encontrada no sidebar.`);
	}
	return { sections, articles };
}

/** Substitui `node` por `replacement` (nó ou lista de nós) dentro de `parent`. */
function replaceChild(parent, node, replacement) {
	const index = parent.children.indexOf(node);
	if (index === -1) return;
	parent.children.splice(index, 1, ...(Array.isArray(replacement) ? replacement : [replacement]));
}

/** Percorre a árvore de baixo para cima, permitindo trocar ou remover o nó visitado. */
function transformTree(parent, visitor) {
	for (const child of [...(parent.children || [])]) {
		if (child.type === 'element') {
			transformTree(child, visitor);
			visitor(child, parent);
		} else if (child.type === 'comment') {
			replaceChild(parent, child, []);
		}
	}
}

function convertAside(node) {
	const type = classesOf(node).find((c) => c.startsWith('starlight-aside--'))?.slice('starlight-aside--'.length);
	const title = toText(select('.starlight-aside__title', node) || el('span', {}, []), { whitespace: 'normal' }).trim();
	const content = select('.starlight-aside__content', node);
	return el('aside', { className: ['doc-callout', `doc-callout--${ASIDE_TYPES.has(type) ? type : 'note'}`] }, [
		...(title ? [el('p', { className: ['doc-callout__title'] }, [textNode(title)])] : []),
		...(content?.children || []),
	]);
}

function convertCard(node) {
	const title = toText(select('.title', node) || el('span', {}, []), { whitespace: 'normal' }).trim();
	const body = select('.body', node);
	return el('section', { className: ['doc-card'] }, [
		...(title ? [el('h3', { className: ['doc-card__title'] }, [textNode(title)])] : []),
		...(body?.children || []),
	]);
}

function convertCodeFrame(node) {
	const pre = select('pre', node);
	const lines = selectAll('.ec-line', node).map((line) => toText(line, { whitespace: 'pre' }).replace(/\n$/, ''));
	const code = lines.length ? lines.join('\n') : toText(pre || node, { whitespace: 'pre' });
	const language = pre?.properties?.dataLanguage;
	return el('pre', { className: ['doc-code'], ...(language && language !== 'plaintext' ? { dataLanguage: language } : {}) }, [
		el('code', {}, [textNode(code)]),
	]);
}

function convertTabs(node) {
	const labels = selectAll('[role="tab"]', node).map((tab) => toText(tab, { whitespace: 'normal' }).trim());
	const panels = selectAll('[role="tabpanel"]', node);
	return panels.map((panel, index) => el('section', { className: ['doc-tabs'] }, [
		...(labels[index] ? [el('h3', { className: ['doc-tabs__title'] }, [textNode(labels[index])])] : []),
		...panel.children,
	]));
}

/** Converte componentes do Starlight em elementos doc-* e reescreve links/imagens. */
function normalizeContent(root, ctx) {
	for (const selector of DROP_SELECTORS) {
		for (const node of selectAll(selector, root)) node.__drop = true;
	}

	transformTree(root, (node, parent) => {
		if (node.__drop) return replaceChild(parent, node, []);

		const classes = classesOf(node);
		if (classes.includes('sl-heading-wrapper')) {
			return replaceChild(parent, node, node.children.filter((c) => c.type === 'element' && /^h[2-6]$/.test(c.tagName)));
		}
		if (node.tagName === 'aside' && classes.includes('starlight-aside')) return replaceChild(parent, node, convertAside(node));
		if (node.tagName === 'ol' && classes.includes('sl-steps')) {
			node.properties = { className: ['doc-steps'] };
			return;
		}
		if (classes.includes('card-grid')) {
			node.tagName = 'div';
			node.properties = { className: ['doc-cards'] };
			return;
		}
		if (node.tagName === 'article' && classes.includes('card')) return replaceChild(parent, node, convertCard(node));
		if (node.tagName === 'figure' && classes.includes('frame')) return replaceChild(parent, node, convertCodeFrame(node));
		if (node.tagName === 'starlight-tabs') return replaceChild(parent, node, convertTabs(node));

		if (node.tagName.includes('-')) {
			throw new Error(`[central-catalog] ${ctx.id}: componente <${node.tagName}> sem conversão. Adicione o tratamento em integrations/central-catalog.mjs.`);
		}

		if (node.tagName === 'a') rewriteLink(node, ctx);
		if (node.tagName === 'img') rewriteImage(node, ctx);
	});

	// Segunda passada: tags fora da lista viram seus filhos; atributos são filtrados.
	transformTree(root, (node, parent) => {
		if (!ALLOWED_TAGS.has(node.tagName)) return replaceChild(parent, node, node.children || []);
		const allowed = new Set([...ALLOWED_ATTRS['*'], ...(ALLOWED_ATTRS[node.tagName] || [])]);
		const properties = {};
		for (const [key, value] of Object.entries(node.properties || {})) {
			if (!allowed.has(key)) continue;
			if (key === 'className') {
				const docClasses = value.map(String).filter((c) => c.startsWith('doc-'));
				if (docClasses.length) properties.className = docClasses;
				continue;
			}
			properties[key] = value;
		}
		node.properties = properties;
		// span/div sem classe não carregam significado.
		if ((node.tagName === 'span' || node.tagName === 'div') && !properties.className) {
			replaceChild(parent, node, node.children || []);
		}
	});
}

function rewriteLink(node, ctx) {
	const raw = String(node.properties?.href || '');
	if (!raw || raw.startsWith('#') || /^(mailto|tel):/i.test(raw)) return;

	const url = new URL(raw, ctx.pageUrl);
	if (url.origin !== ctx.siteUrl.origin || !url.pathname.startsWith(ctx.siteUrl.pathname)) {
		node.properties.target = '_blank';
		node.properties.rel = 'noopener noreferrer';
		return;
	}

	const id = linkToId(url.pathname.slice(ctx.siteUrl.pathname.length));
	node.properties.href = url.href;
	if (ctx.articleIds.has(id)) {
		node.properties.dataDocArticle = id;
		if (url.hash) node.properties.dataDocAnchor = decodeURIComponent(url.hash.slice(1));
	} else {
		// Página do site fora do catálogo (ex.: docs administrativas): abre no navegador.
		node.properties.target = '_blank';
		node.properties.rel = 'noopener noreferrer';
		ctx.warnings.push(`${ctx.id}: link para página fora do catálogo (${url.pathname})`);
	}
}

function rewriteImage(node, ctx) {
	const src = node.properties?.src;
	if (src) node.properties.src = new URL(String(src), ctx.pageUrl).href;
	node.properties.loading = 'lazy';
}

function collectHeadings(root) {
	return selectAll('h2, h3', root)
		.filter((h) => h.properties?.id && !classesOf(h).some((c) => c.startsWith('doc-')))
		.map((h) => ({ id: String(h.properties.id), text: toText(h, { whitespace: 'normal' }).trim(), level: Number(h.tagName[1]) }));
}

function metaContent(tree, selector) {
	return select(selector, tree)?.properties?.content?.toString().trim() || '';
}

async function buildArticle(entry, ctx) {
	const file = new URL(`${entry.id}/index.html`, ctx.distDir);
	let html;
	try {
		html = await readFile(file, 'utf8');
	} catch {
		throw new Error(`[central-catalog] página do sidebar não gerada: ${entry.id} (${fileURLToPath(file)})`);
	}

	const tree = fromHtml(html);
	const content = select('.sl-markdown-content', tree);
	if (!content) {
		throw new Error(`[central-catalog] ${entry.id}: ".sl-markdown-content" não encontrado. A estrutura do Starlight mudou; revise integrations/central-catalog.mjs.`);
	}

	const locale = String(select('html', tree)?.properties?.lang || ctx.defaultLocale);
	const canonical = select('link[rel="canonical"]', tree)?.properties?.href;
	const pageUrl = canonical ? String(canonical) : new URL(`${entry.id}/`, ctx.siteUrl).href;
	const title = toText(select('h1#_top', tree) || select('h1', tree) || el('span', {}, []), { whitespace: 'normal' }).trim() || entry.label;
	const description = metaContent(tree, 'meta[name="description"]');

	normalizeContent(content, { ...ctx, id: entry.id, pageUrl });
	const root = { type: 'root', children: content.children };
	const articleHtml = toHtml(root).trim();
	const text = toText(el('div', {}, root.children), { whitespace: 'normal' }).replace(/\s+/g, ' ').trim();
	if (!text) throw new Error(`[central-catalog] ${entry.id}: conteúdo vazio após a conversão.`);

	return {
		id: entry.id,
		locale,
		translationKey: entry.id,
		section: entry.section,
		order: entry.order,
		title,
		description,
		url: pageUrl,
		html: articleHtml,
		text,
		headings: collectHeadings(root),
		readingMinutes: Math.max(1, Math.ceil(text.split(' ').length / WORDS_PER_MINUTE)),
		hash: createHash('sha256').update(articleHtml).digest('hex').slice(0, 16),
	};
}

/**
 * @param {{ sidebar: any[], sections: string[], exclude?: string[], defaultLocale?: string }} options
 * @returns {import('astro').AstroIntegration}
 */
export default function centralCatalog({ sidebar, sections: sectionIds, exclude = [], defaultLocale = 'pt-BR' }) {
	let siteUrl;

	return {
		name: 'central-catalog',
		hooks: {
			'astro:config:done': ({ config }) => {
				if (!config.site) throw new Error('[central-catalog] defina `site` no astro.config.mjs.');
				const base = config.base.endsWith('/') ? config.base : `${config.base}/`;
				siteUrl = new URL(base, config.site);
			},
			'astro:build:done': async ({ dir, logger }) => {
				const { sections, articles: entries } = catalogEntriesFromSidebar(sidebar, sectionIds, exclude);
				const ctx = { distDir: dir, siteUrl, defaultLocale, articleIds: new Set(entries.map((e) => e.id)), warnings: [] };

				const articles = [];
				for (const entry of entries) articles.push(await buildArticle(entry, ctx));

				const catalog = {
					schemaVersion: SCHEMA_VERSION,
					generatedAt: new Date().toISOString(),
					site: siteUrl.href,
					defaultLocale,
					locales: [...new Set(articles.map((a) => a.locale))],
					sections,
					articles,
				};
				await writeFile(new URL(OUTPUT_FILE, dir), JSON.stringify(catalog));

				for (const warning of new Set(ctx.warnings)) logger.warn(warning);
				const kb = Math.round(Buffer.byteLength(JSON.stringify(catalog)) / 1024);
				logger.info(`${OUTPUT_FILE}: ${articles.length} artigos em ${sections.length} seções (${kb} KB)`);
			},
		},
	};
}
