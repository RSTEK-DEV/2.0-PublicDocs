// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { sidebar } from './src/sidebar.mjs';
import centralCatalog from './integrations/central-catalog.mjs';

const isGithubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
	site: isGithubPages
		? 'https://rstek-dev.github.io'  // ← CORRIGIDO: GitHub Pages quando GITHUB_PAGES=true
		: 'https://docs.standdigital.com.br',

	base: isGithubPages
		? '/2.0-PublicDocs/'  // ← CORRIGIDO: precisa da base quando no GitHub Pages
		: '/',

	redirects: {
		// O guia "Personalização do perfil" era uma cópia do "Personal branding".
		'/guides-stand/personalizacao-perfil/': '/guides-stand/personal-branding/',
		// Endereços antigos, com erro de digitação, mantidos para links já enviados.
		'/guides-stand/construindo-carteir/': '/guides-stand/construindo-carteira/',
		'/guides-stand/mensagen-engajadas/': '/guides-stand/mensagens-engajadas/',
		'/guides-stand/networkig/': '/guides-stand/networking/',
		'/guides-stand/personal-brandig/': '/guides-stand/personal-branding/',
		// A página do painel Acompanhar se chamava "Meus Links".
		'/docs-stand/meus-links/': '/docs-stand/acompanhar/',
	},

	integrations: [
		starlight({
			title: '',
			customCss: ['./src/assets/style.css'],
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
			sidebar,
		}),
		centralCatalog({
			sidebar,
			sections: ['docs-stand', 'guides-stand'],
			exclude: ['guides-stand/'],
		}),
	],
});
