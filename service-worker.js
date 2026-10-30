
const CACHE_NAME = "runworld-static-v2";

const ARQUIVOS = [
    "./",
    "./animacao.html",
    "./inicio.html",
    "./index.html",
    "./style.css",
    "./app.js",
    "./config.js",
    "./notificacoes.js",
    "./manifest.json",
    "./IMG-20260923-WA4190.jpg",
    "./logo_animacao.mp4"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async function (cache) {
            await Promise.allSettled(
                ARQUIVOS.map(async function (arquivo) {
                    try {
                        const resposta = await fetch(arquivo, {
                            cache: "no-cache"
                        });

                        if (resposta.ok) {
                            await cache.put(arquivo, resposta);
                        }
                    } catch (erro) {
                        // Um arquivo opcional ausente não impede
                        // a instalação do service worker.
                    }
                })
            );

            await self.skipWaiting();
        })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (nomes) {
                return Promise.all(
                    nomes
                        .filter(function (nome) {
                            return (
                                nome.startsWith("runworld-") &&
                                nome !== CACHE_NAME
                            );
                        })
                        .map(function (nome) {
                            return caches.delete(nome);
                        })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

self.addEventListener("fetch", function (event) {
    const requisicao = event.request;

    if (requisicao.method !== "GET") {
        return;
    }

    const url = new URL(requisicao.url);

    // Não intercepta APIs externas, Supabase ou mapas.
    if (url.origin !== self.location.origin) {
        return;
    }

    // Navegações: tenta buscar a página atualizada primeiro.
    if (requisicao.mode === "navigate") {
        event.respondWith(
            (async function () {
                try {
                    const resposta = await fetch(requisicao);

                    if (resposta.ok) {
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(requisicao, resposta.clone());
                    }

                    return resposta;
                } catch (erro) {
                    // Sem internet, devolve a página solicitada,
                    // e não o index.html indiscriminadamente.
                    const guardada = await caches.match(requisicao);

                    if (guardada) {
                        return guardada;
                    }

                    // Alternativas específicas para cada tela.
                    const caminho = url.pathname;

                    if (caminho.endsWith("/animacao.html")) {
                        const animacao = await caches.match(
                            "./animacao.html"
                        );

                        if (animacao) return animacao;
                    }

                    if (caminho.endsWith("/inicio.html")) {
                        const inicio = await caches.match(
                            "./inicio.html"
                        );

                        if (inicio) return inicio;
                    }

                    if (
                        caminho.endsWith("/index.html") ||
                        caminho.endsWith("/")
                    ) {
                        const principal = await caches.match(
                            "./index.html"
                        );

                        if (principal) return principal;
                    }

                    return new Response(
                        "Você está sem conexão. Conecte-se à internet e tente novamente.",
                        {
                            status: 503,
                            headers: {
                                "Content-Type": "text/plain; charset=utf-8"
                            }
                        }
                    );
                }
            })()
        );

        return;
    }

    // Recursos estáticos: usa o cache se disponível.
    event.respondWith(
        (async function () {
            const guardado = await caches.match(requisicao);

            if (guardado) {
                return guardado;
            }

            const resposta = await fetch(requisicao);

            if (resposta.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(requisicao, resposta.clone());
            }

            return resposta;
        })()
    );
});
