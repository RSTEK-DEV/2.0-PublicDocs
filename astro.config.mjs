// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const isGithubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
	site: isGithubPages
		? 'https://docs.seudominio.com'
		: 'https://rstek-dev.github.io',

	base: isGithubPages
		? '/'
		: '/2.0-PublicDocs/',

	integrations: [
		starlight({
			title: '',
			locales: {
				root: {
					label: 'Português (Brasil)',
					lang: 'pt-BR',
				},
			},
			description: 'A plataforma completa para lançamentos imobiliários.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/RSTEK-DEV',
				},
			],
			logo: {
				src: '/src/assets/logo.svg',
				alt: 'Logomarca StandDigital',
			},
			sidebar: [
				{
					label: 'Stand Digital',
					collapsed: true,
					badge: { text: '+2.0', variant: 'success' },
					autogenerate: { directory: 'docs-stand' },
				},
				{
					label: 'Área administrativa',
					collapsed: true,
					badge: { text: '+2.0', variant: 'success' },
					autogenerate: { directory: 'docs-admin' },
				},
				{
					label: 'Guias corretores',
					collapsed: true,
					autogenerate: { directory: 'guides-stand' },
				},
				{
					label: 'Guias Adm',
					collapsed: true,
					autogenerate: { directory: 'guides-admin' },
				},
			],
		}),
	],
});
