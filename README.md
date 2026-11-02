# Documentação pública do Stand Digital

## Catálogo da Central de Ajuda

Todo build gera `dist/catalog.json`, publicado em `https://docs.standdigital.com.br/catalog.json`.
O Stand Digital lê esse arquivo para mostrar os artigos na Central de Ajuda.

- **O que entra:** as seções `docs-stand` e `guides-stand`, na ordem do sidebar (`src/sidebar.mjs`).
  Para incluir, tirar ou reordenar um artigo, edite o sidebar.
- **Como é gerado:** a integração `integrations/central-catalog.mjs` lê o HTML final de cada página e
  converte os componentes do Starlight em HTML neutro (`doc-callout`, `doc-steps`, `doc-cards`...).
  O contrato do JSON está descrito no início desse arquivo.
- **Quando o build falha:** se uma página do sidebar não existir, se a estrutura do Starlight mudar ou
  se um artigo usar um componente sem conversão. Nesses casos, ajuste a integração antes de publicar.

---

# Starlight Starter Kit: Basics

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

```
npm create astro@latest -- --template starlight
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   └── docs/
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
