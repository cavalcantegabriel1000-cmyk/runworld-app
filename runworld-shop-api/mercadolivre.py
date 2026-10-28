
import httpx
from urllib.parse import urlparse

API_URL = "https://api.mercadolibre.com/sites/MLB/search"

CATEGORIAS = {
    "calcados": "tenis corrida",
    "roupas": "roupa esportiva corrida",
    "acessorios": "garrafa esportiva",
    "tecnologia": "relogio esportivo",
}


def link_seguro(url):
    if not url:
        return None

    parsed = urlparse(url)
    host = parsed.hostname or ""

    if parsed.scheme != "https":
        return None

    if host != "mercadolivre.com.br" and not host.endswith(
        ".mercadolivre.com.br"
    ):
        return None

    return url


async def buscar_produtos(
    busca="tenis corrida",
    limite=20,
):
    busca = busca.strip()[:100]

    if not busca:
        return []

    limite = max(1, min(int(limite), 50))

    params = {
        "q": busca,
        "limit": limite,
    }

    timeout = httpx.Timeout(15.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        resposta = await client.get(
            API_URL,
            params=params,
            headers={
                "User-Agent": "RunWorld-Shop/1.0",
                "Accept": "application/json",
            },
        )

        resposta.raise_for_status()
        dados = resposta.json()

    produtos = []

    for item in dados.get("results", []):
        preco = item.get("price")
        link = link_seguro(item.get("permalink"))

        if not link or preco is None:
            continue

        try:
            preco = float(preco)
        except (TypeError, ValueError):
            continue

        if preco < 0:
            continue

        imagem = item.get("thumbnail")
        if imagem and imagem.startswith("http://"):
            imagem = "https://" + imagem[len("http://"):]

        produtos.append({
            "id": str(item.get("id", "")),
            "name": item.get("title", "Produto"),
            "category": "outros",
            "description": "Produto anunciado no Mercado Livre.",
            "price": preco,
            "previous_price": None,
            "image": imagem,
            "seller": "Mercado Livre",
            "url": link,
            "source": "mercadolivre",
        })

    return produtos


async def buscar_categoria(categoria, limite=20):
    termo = CATEGORIAS.get(categoria)

    if not termo:
        raise ValueError("Categoria não reconhecida.")

    return await buscar_produtos(termo, limite)
      
