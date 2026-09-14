targetScope = 'subscription'

@allowed(['dev', 'test', 'prod'])
param environment string
param location string
param repository string = 'Danilogggs/BigPecas'

resource group 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-bigpecas-${environment}'
  location: location
  tags: { project: 'BigPecas', environment: environment, managedBy: 'Bicep' }
}

module access 'modules/access.bicep' = {
  name: 'access-${environment}'
  scope: group
  params: { environment: environment, repository: repository, location: location }
}

output clientId string = access.outputs.clientId
output resourceGroup string = group.name
