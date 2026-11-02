// Sidebar do Starlight. Também define as seções e a ordem dos artigos
// publicados no catálogo da Central de Ajuda (ver integrations/central-catalog.mjs).
export const sidebar = [
	{
		label: 'Fale com a gente',
		link: 'https://wa.me/5511988157196',
		attrs: { target: '_blank', class: 'cta-button' }
	},
	{
		label: 'Primeiro acesso',
		link: '/guides-stand/primeiro-acesso/',
		badge: { text: 'Comece aqui', variant: 'tip' },
	},
	{
		label: 'Stand Digital — Plataforma',
		collapsed: false,
		badge: { text: 'v2.3', variant: 'success' },
		items: [
			{ label: 'Visão geral', link: '/docs-stand/' },
			{ label: 'Acesso, perfil e VCard', link: '/docs-stand/acesso-e-perfil/' },
			{ label: 'O stand do empreendimento', link: '/docs-stand/stand-do-empreendimento/' },
			{ label: 'Compartilhamento inteligente', link: '/docs-stand/compartilhamento/' },
			{ label: 'Tabela de preços e simulação', link: '/docs-stand/tabela-de-precos-e-simulacao/' },
			{ label: 'Playbook com IA', link: '/docs-stand/playbook/' },
			{ label: 'Mídias pessoais', link: '/docs-stand/midias-pessoais/' },
		],
	},
	{
		label: 'Guias do Corretor',
		collapsed: false,
		items: [
			{ label: 'Índice dos guias', link: '/guides-stand/' },
			{ label: 'Primeiro acesso (passo a passo)', link: '/guides-stand/primeiro-acesso/' },
			{ label: 'Modo guiado vs modo livre', link: '/guides-stand/usando-modo-guiado/' },
			{ label: 'Compartilhar pelo WhatsApp', link: '/guides-stand/guia-whatsapp/' },
			{ label: 'Aumentar taxa de conversão', link: '/guides-stand/aumentar-taxa-conversao/' },
			{ label: 'Mensagens que engajam', link: '/guides-stand/mensagen-engajadas/' },
			{ label: 'Construindo sua carteira', link: '/guides-stand/construindo-carteir/' },
			{ label: 'Organizar sua rotina', link: '/guides-stand/organizar-rotina/' },
			{ label: 'Personal branding', link: '/guides-stand/personal-brandig/' },
			{ label: 'Networking digital', link: '/guides-stand/networkig/' },
			{ label: 'Personalização do perfil', link: '/guides-stand/personalizacao-perfil/' },
		],
	},
	{
		label: 'Documentação Administrativa',
		link: 'https://adm-docs.standdigital.com.br',
		attrs: { target: '_blank' },
	},
];
