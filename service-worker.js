
const CACHE_NAME = "runworld-static-v1";

const ARQUIVOS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./config.js",
    "./notificacoes.js",
    "./manifest.json",
    "./IMG-20260923-WA4190.jpg"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async function (cache) {
            await Promise.allSettled(
                ARQUIVOS.map(async function (arquivo) {
                    try {
                        const resposta = await fetch(arquivo);

                        if (resposta.ok) {
                            await cache.put(arquivo, resposta);
                        }
                    } catch (erro) {
                        console.warn(
                            "Não foi possível guardar:",
                            arquivo
                        );
                    }
                })
            );
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (nomes) {
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
        }).then(function () {
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

    if (requisicao.mode === "navigate") {
        event.respondWith(
            fetch(requisicao)
                .then(function (resposta) {
                    if (resposta.ok) {
                        const copia = resposta.clone();

                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put("./index.html", copia);
                        });
                    }

                    return resposta;
                })
                .catch(async function () {
                    return (
                        await caches.match(requisicao) ||
                        await caches.match("./index.html")
                    );
                })
        );

        return;
    }

    event.respondWith(
        caches.match(requisicao).then(function (guardado) {
            if (guardado) {
                return guardado;
            }

            return fetch(requisicao).then(function (resposta) {
                if (resposta.ok) {
                    const copia = resposta.clone();

                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(requisicao, copia);
                    });
                }

                return resposta;
            });
        })
    );
});
