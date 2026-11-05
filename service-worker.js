
/*
 * RUNWORLD — SERVICE WORKER
 * Cache da versão PWA.
 * O aplicativo nativo Capacitor não depende deste arquivo.
 */

const CACHE_NAME = "runworld-static-v6";

const ARQUIVOS = [
    "./",
    "./animacao.html",
    "./inicio.html",
    "./index.html",
    "./login.html",
    "./cadastro.html",
    "./recuperar-senha.html",
    "./redefinir-senha.html",

    "./style.css",
    "./app.js",
    "./config.js",
    "./notificacoes.js",
    "./shop.js",
    "./shop.css",
    "./login.css",
    "./cadastro.css",

    "./manifest.json",

    "./icon-192.png",
    "./icon-512.png",

    "./IMG-20260923-WA4190.jpg",
    "./IMG-20261022-WA2582.jpg",

    "./logo_animacao.mp4",
    "./VID-20261001-WA7966.mp4"
];

// INSTALAÇÃO
self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const arquivo of ARQUIVOS) {
            try {
                const resposta = await fetch(arquivo, {
                    cache: "reload"
                });

                if (resposta.ok) {
                    await cache.put(arquivo, resposta);
                }

            } catch (erro) {
                console.warn(
                    "Não foi possível armazenar:",
                    arquivo
                );
            }
        }

        await self.skipWaiting();
    })());
});

// ATIVAÇÃO E LIMPEZA DE CACHE ANTIGO
self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const nomes = await caches.keys();

        await Promise.all(
            nomes
                .filter(nome =>
                    nome.startsWith("runworld-static-") &&
                    nome !== CACHE_NAME
                )
                .map(nome => caches.delete(nome))
        );

        await self.clients.claim();
    })());
});

// REQUISIÇÕES
self.addEventListener("fetch", event => {
    const requisicao = event.request;

    if (requisicao.method !== "GET") return;

    const url = new URL(requisicao.url);

    // Não interfere em serviços externos.
    if (url.origin !== self.location.origin) return;

    // PÁGINAS
    if (requisicao.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const resposta = await fetch(requisicao);

                if (resposta.ok) {
                    const cache = await caches.open(CACHE_NAME);

                    await cache.put(
                        requisicao,
                        resposta.clone()
                    );
                }

                return resposta;

            } catch (erro) {
                const cache = await caches.open(CACHE_NAME);

                return (
                    await cache.match(requisicao) ||
                    await cache.match("./animacao.html") ||
                    await cache.match("./inicio.html") ||
                    await cache.match("./")
                ) || Response.error();
            }
        })());

        return;
    }

    // CSS, JS, IMAGENS E OUTROS ARQUIVOS
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        const guardado = await cache.match(requisicao);

        if (guardado) {
            return guardado;
        }

        try {
            const resposta = await fetch(requisicao);

            if (resposta.ok) {
                await cache.put(
                    requisicao,
                    resposta.clone()
                );
            }

            return resposta;

        } catch (erro) {
            return Response.error();
        }
    })());
});
