
const fs = require("fs");
const path = require("path");

const raiz = __dirname;
const destino = path.join(raiz, "www");

const ignorar = new Set([
    ".git",
    ".github",
    ".idea",
    ".vscode",
    "node_modules",
    "android",
    "ios",
    "www",
    "runworld-shop-api"
]);

const arquivosIgnorados = new Set([
    "package.json",
    "package-lock.json",
    "LEIA-ME-CAPACITOR.txt"
]);

function copiar(origem, destinoAtual) {
    const itens = fs.readdirSync(origem, {
        withFileTypes: true
    });

    for (const item of itens) {
        const caminhoOrigem = path.join(origem, item.name);
        const caminhoDestino = path.join(destinoAtual, item.name);

        if (item.isDirectory()) {
            if (ignorar.has(item.name)) {
                continue;
            }

            fs.mkdirSync(caminhoDestino, {
                recursive: true
            });

            copiar(caminhoOrigem, caminhoDestino);

        } else if (item.isFile()) {
            if (arquivosIgnorados.has(item.name)) {
                continue;
            }

            fs.copyFileSync(
                caminhoOrigem,
                caminhoDestino
            );
        }
    }
}

try {
    console.log("Preparando arquivos do RunWorld...");

    // Recria somente a pasta www.
    if (fs.existsSync(destino)) {
        fs.rmSync(destino, {
            recursive: true,
            force: true
        });
    }

    fs.mkdirSync(destino, {
        recursive: true
    });

    copiar(raiz, destino);

    console.log("Arquivos copiados com sucesso!");
    console.log("Pasta preparada:", destino);

} catch (erro) {
    console.error("Erro ao preparar o RunWorld:", erro);
    process.exit(1);
}
