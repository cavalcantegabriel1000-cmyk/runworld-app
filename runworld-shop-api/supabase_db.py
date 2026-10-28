
import os
from datetime import datetime, timezone

from supabase import create_client


def conectar_supabase():
    url = os.getenv("SUPABASE_URL")
    chave = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not chave:
        raise RuntimeError(
            "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY "
            "no ambiente do servidor."
        )

    return create_client(url, chave)


def salvar_produtos(produtos):
    if not isinstance(produtos, list):
        raise ValueError("Os produtos devem ser enviados em uma lista.")

    if not produtos:
        return 0

    campos_permitidos = {
        "id",
        "name",
        "category",
        "description",
        "price",
        "previous_price",
        "image",
        "seller",
        "url",
        "source",
    }

    registros = []

    for produto in produtos:
        if not isinstance(produto, dict):
            continue

        registro = {
            chave: valor
            for chave, valor in produto.items()
            if chave in campos_permitidos
        }

        if not registro.get("id") or not registro.get("name"):
            continue

        if registro.get("price") is None or not registro.get("url"):
            continue

        registro["updated_at"] = datetime.now(
            timezone.utc
        ).isoformat()

        registros.append(registro)

    if not registros:
        return 0

    supabase = conectar_supabase()

    resposta = (
        supabase.table("shop_products")
        .upsert(registros, on_conflict="id")
        .execute()
    )

    return len(resposta.data or [])
  
