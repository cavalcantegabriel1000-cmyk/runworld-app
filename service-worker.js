
const CACHE_NAME = "runworld-static-v3";

const ARQUIVOS = [
    "./",
    "./animacao.html",
    "./inicio.html",
    "./index.html",
    "./login.html",
    "./cadastro.html",
    "./style.css",
    "./app.js",
    "./config.js",
    "./notificacoes.js",
    "./login.css",
    "./cadastro.css",
    "./manifest.json",
    "./IMG-20260923-WA4190.jpg",
    "./logo_animacao.mp4",
    "./VID-20261001-WA7966.mp4"
];

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        await Promise.allSettled(
            ARQUIVOS.map(async arquivo => {
                try {
                    const resposta = await fetch(arquivo, {
                        cache: "reload"
                    });

                    if (resposta.ok) {
                        await cache.put(arquivo, resposta);
                    }
                } catch (erro) {
                    // Um arquivo que não existe ou está offline
                    // não deve impedir a instalação do service worker.
                    console.warn("Arquivo não armazenado:", arquivo);
                }
            })
        );

        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const nomes = await caches.keys();

        await Promise.all(
            nomes
                .filter(nome =>
                    nome.startsWith("runworld-") &&
                    nome !== CACHE_NAME
                )
                .map(nome => caches.delete(nome))
        );

        await self.clients.claim();
    })());
});

self.addEventListener("fetch", event => {
    const requisicao = event.request;

    if (requisicao.method !== "GET") return;

    const url = new URL(requisicao.url);

    // Não interceptar Supabase, autenticação externa ou mapas.
    if (url.origin !== self.location.origin) return;

    if (requisicao.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const resposta = await fetch(requisicao);

                if (resposta.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(requisicao, resposta.clone());
                }

                return resposta;
            } catch (erro) {
                const cache = await caches.open(CACHE_NAME);

                return (
                    await cache.match(requisicao) ||
                    await cache.match("./animacao.html") ||
                    await cache.match("./inicio.html")
                ) || Response.error();
            }
        })());

        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const guardado = await cache.match(requisicao);

        if (guardado) return guardado;

        try {
            const resposta = await fetch(requisicao);

            if (resposta.ok) {
                await cache.put(requisicao, resposta.clone());
            }

            return resposta;
        } catch (erro) {
            return Response.error();
        }
    })());
});
