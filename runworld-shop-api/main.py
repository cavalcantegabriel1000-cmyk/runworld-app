
import os
import logging
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from mercadolivre import (
    buscar_produtos,
    buscar_categoria,
    CATEGORIAS,
)
from supabase_db import salvar_produtos


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("runworld-shop")

app = FastAPI(
    title="RunWorld Shop API",
    description="Produtos e promoções do RunWorld",
    version="1.2.1",
)

origins = [
    item.strip()
    for item in os.getenv(
        "RUNWORLD_ALLOWED_ORIGINS", "*"
    ).split(",")
    if item.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/")
def home():
    return {
        "app": "RunWorld Shop API",
        "status": "online",
        "version": "1.2.1",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/products")
async def list_products(
    search: str = Query(default="", max_length=100),
    category: str = Query(default="", max_length=40),
    limit: int = Query(default=20, ge=1, le=50),
):
    try:
        if category:
            if category not in CATEGORIAS:
                raise HTTPException(
                    status_code=400,
                    detail="Categoria não reconhecida.",
                )

            items = await buscar_categoria(category, limit)

        else:
            termo = search.strip() or "tenis corrida"
            items = await buscar_produtos(termo, limit)

        saved = False

        if (
            items
            and os.getenv("SUPABASE_URL")
            and os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        ):
            try:
                salvar_produtos(items)
                saved = True
            except Exception:
                logger.exception(
                    "Erro ao salvar produtos no Supabase."
                )

        return {
            "items": items,
            "total": len(items),
            "source": "mercadolivre",
            "saved_to_database": saved,
            "updated_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

    except HTTPException:
        raise

    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        resposta = exc.response.text[:500]

        logger.error(
            "Fonte de produtos respondeu HTTP %s. Resposta: %s",
            status,
            resposta,
        )

        raise HTTPException(
            status_code=502,
            detail="A fonte de produtos recusou ou não concluiu a consulta.",
        ) from exc

    except httpx.RequestError as exc:
        logger.exception(
            "Falha de conexão com a fonte de produtos: %s",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail="Não foi possível conectar à fonte de produtos.",
        ) from exc

    except ValueError as exc:
        logger.exception(
            "Erro ao interpretar os dados dos produtos: %s",
            str(exc)[:300],
        )

        raise HTTPException(
            status_code=502,
            detail="A resposta da fonte de produtos é inválida.",
        ) from exc


@app.post("/price-check")
def check_price(data: dict):
    try:
        previous = float(data["previous_price"])
        current = float(data["current_price"])
        product_id = str(data["product_id"])

    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=422,
            detail="Informe product_id, previous_price e current_price.",
        )

    if previous <= 0 or current < 0:
        raise HTTPException(
            status_code=422,
            detail="O preço anterior deve ser positivo e o atual não pode ser negativo.",
        )

    dropped = current < previous

    return {
        "product_id": product_id,
        "promotion": dropped,
        "previous_price": previous if dropped else None,
        "current_price": current,
        "discount_percent": (
            round((previous - current) / previous * 100, 2)
            if dropped
            else 0
        ),
        "message": (
            "Queda detectada nos valores recebidos."
            if dropped
            else "Nenhuma queda de preço detectada."
        ),
    }
    
