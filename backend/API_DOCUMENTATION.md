# API de Peças - Documentação

## Endpoints

### GET /api/pecas
Retorna as peças cadastradas. Este endpoint aceita filtros dinâmicos e ordenação via Query Parameters.

**Query Parameters (Opcionais):**
- `nome`: Busca parcial no nome.
- `categoria_id`: ID da categoria.
- `material_id`: ID do material.
- `condicao`: Filtro por condição (NOS, Restaurada, etc).
- `oem_number`: Número original.
- `num_serie`: Número de série.
- `min_preco`: Preço mínimo.
- `max_preco`: Preço máximo.
- `min_estoque`: Estoque mínimo.
- `sort`: Campo para ordenar (`preco` ou `data`).
- `order`: Direção (`asc` ou `desc`).

**Response (200):**
```json
[
  {
    "id": 1,
    "nome_peca": "Motor V8 Recondicionado",
    "sku": "MV8-001",
    "oem_number": "OEM123456",
    "num_serie": "SN987654",
    "categoria_id": 1,
    "material_id": 1,
    "condicao": "NOS",
    "peso_gramas": 5000,
    "comprimento_mm": 500,
    "largura_mm": 600,
    "altura_mm": 450,
    "detalhes_gravacao": "Logo Ford timbrado",
    "historico_proveniencia": "Procedência comprovada",
    "preco": "12500.00",
    "estoque_atual": 1,
    "data_cadastro": "2026-03-29T10:30:00.000Z"
  }
]
```

---

### GET /api/pecas/:id
Retorna uma peça específica pelo ID.

**Parameters:**
- `id` (integer, required): ID da peça

**Response (200):**
```json
{
  "id": 1,
  "nome_peca": "Motor V8 Recondicionado",
  "sku": "MV8-001",
  ...
}
```

**Response (404):**
```json
{ "error": "Peça não encontrada" }
```

---

### POST /api/pecas/cadastrar
Cadastra uma nova peça.

**Request Body:**
```json
{
  "nome_peca": "Motor V8 Recondicionado",
  "sku": "MV8-001",
  "oem_number": "OEM123456",
  "num_serie": "SN987654",
  "categoria_id": 1,
  "material_id": 1,
  "condicao": "NOS",
  "peso_gramas": 5000,
  "comprimento_mm": 500,
  "largura_mm": 600,
  "altura_mm": 450,
  "detalhes_gravacao": "Logo Ford timbrado",
  "historico_proveniencia": "Procedência comprovada",
  "preco": 12500.00,
  "estoque_atual": 1
}
```

**Required Fields:**
- `nome_peca`
- `preco`

**Response (201):**
```json
{
  "id": 1,
  "message": "Peça cadastrada com sucesso!"
}
```

**Response (400):**
```json
{ "error": "Nome da peça e preço são obrigatórios" }
```

---

### PUT /api/pecas/:id
Atualiza uma peça existente.

**Parameters:**
- `id` (integer, required): ID da peça

**Request Body:**
```json
{
  "nome_peca": "Motor V8 Recondicionado - Atualizado",
  "preco": 13000.00,
  "estoque_atual": 2
}
```

**Response (200):**
```json
{
  "id": 1,
  "message": "Peça atualizada com sucesso!"
}
```

**Response (404):**
```json
{ "error": "Peça não encontrada" }
```

---

### DELETE /api/pecas/:id
Deleta uma peça.

**Parameters:**
- `id` (integer, required): ID da peça

**Response (200):**
```json
{ "message": "Peça deletada com sucesso!" }
```

**Response (404):**
```json
{ "error": "Peça não encontrada" }
```

---

## Campos Disponíveis

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| nome_peca | string | Sim | Nome da peça |
| sku | string | Não | Código interno de estoque |
| oem_number | string | Não | Número original de fábrica |
| num_serie | string | Não | Número de série |
| categoria_id | integer | Não | ID da categoria (FK) |
| material_id | integer | Não | ID do material (FK) |
| condicao | enum | Não | NOS, Original Usada, Restaurada, Reprodução de Época |
| peso_gramas | integer | Não | Peso em gramas |
| comprimento_mm | integer | Não | Comprimento em mm |
| largura_mm | integer | Não | Largura em mm |
| altura_mm | integer | Não | Altura em mm |
| detalhes_gravacao | text | Não | Detalhes de gravação |
| historico_proveniencia | text | Não | Histórico e procedência |
| preco | decimal | Sim | Preço em R$ |
| estoque_atual | integer | Não | Quantidade em estoque |

---

## Condições Aceitas
- `NOS` - Estoque Antigo Novo
- `Original Usada` - Original Usada
- `Restaurada` - Restaurada
- `Reprodução de Época` - Reprodução de Época
