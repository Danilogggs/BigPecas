#!/usr/bin/env bash
# Executar manualmente no Azure Cloud Shell (Bash), apos revisar custos e escopo.
set -euo pipefail
environment="${1:-}"
location="${2:-}"
case "$environment" in dev|test|prod) ;; *) echo 'Uso: bash scripts/devops/bootstrap.sh dev REGIAO'; exit 1 ;; esac
[[ "$location" =~ ^[a-z0-9]+$ ]] || { echo 'Informe a regiao aprovada, como eastus2.'; exit 1; }
az account show --query '{assinatura:name,id:id,status:state}' -o table
echo "Sera criado/configurado apenas rg-bigpecas-$environment e suas identidades/permissoes."
echo 'Nao atribuir acesso a grupos antigos. Revise a assinatura exibida acima.'
read -r -p "Digite bigpecas-$environment para continuar: " confirmation
[[ "$confirmation" == "bigpecas-$environment" ]] || exit 1
if [[ "$(az group exists --name "rg-bigpecas-$environment")" == 'true' ]]; then
  project="$(az group show --name "rg-bigpecas-$environment" --query tags.project -o tsv)"
  [[ "$project" == 'BigPecas' ]] || { echo 'Grupo existente sem identificacao BigPecas. Revise manualmente.'; exit 1; }
fi
for provider in Microsoft.App Microsoft.OperationalInsights Microsoft.ContainerRegistry Microsoft.ManagedIdentity Microsoft.Insights; do
  az provider register --namespace "$provider" --wait
done
az bicep install --version v0.47.16
az deployment sub what-if --location "$location" --template-file infra/azure/bootstrap.bicep --parameters environment="$environment" location="$location" --result-format ResourceIdOnly
read -r -p 'Aplicar este plano de acesso? Digite SIM: ' approval
[[ "$approval" == 'SIM' ]] || exit 1
az deployment sub create --name "bigpecas-access-$environment" --location "$location" --template-file infra/azure/bootstrap.bicep --parameters environment="$environment" location="$location" --query properties.outputs -o json
