# Frete e avaliações

## Frete

O domínio normaliza CEP, dimensões e respostas de transportadoras. `MelhorEnvioGateway` possui a integração OAuth, retry e persistência de tokens. Os casos de uso tratam o resultado externo e o controller apenas traduz HTTP. No frontend, CEP, produtos e cupons ficam no domínio e a chamada autenticada no gateway.

## Avaliações

Notas, comentários, médias, agrupamento por fornecedor e estado da avaliação pertencem ao domínio. A aplicação verifica usuário, propriedade da compra, entrega e duplicidade. Consultas e gravações estão no repositório Supabase. O frontend mantém um gateway compatível e regras puras próprias.
