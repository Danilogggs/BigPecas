@allowed(['dev', 'test', 'prod'])
param environment string
param location string = resourceGroup().location
var prefix = 'bigpecas-${environment}'
var tags = { project: 'BigPecas', environment: environment, managedBy: 'Bicep' }

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'bp${environment}${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${prefix}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: json('0.1') }
  }
}
resource hosting 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${prefix}'
  location: location
  tags: tags
  properties: {
    workloadProfiles: [{ name: 'Consumption', workloadProfileType: 'Consumption' }]
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}
output registryName string = registry.name
output registryServer string = registry.properties.loginServer
output frontendUrl string = 'https://web-${prefix}.${hosting.properties.defaultDomain}'
output backendUrl string = 'https://api-${prefix}.${hosting.properties.defaultDomain}'
