param environment string
param repository string
param location string

resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-bigpecas-${environment}-deploy'
  location: location
}
resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-bigpecas-${environment}-pull'
  location: location
}
resource federation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: deployIdentity
  name: 'github-${environment}'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:${repository}:environment:${environment}'
    audiences: ['api://AzureADTokenExchange']
  }
}
var contributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')
var acrPush = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '8311e382-0749-4cb8-b61a-304f252e45ec')
var acrPull = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
resource deployRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, deployIdentity.id, contributor)
  properties: { principalId: deployIdentity.properties.principalId, principalType: 'ServicePrincipal', roleDefinitionId: contributor }
}
resource pushRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, deployIdentity.id, acrPush)
  properties: { principalId: deployIdentity.properties.principalId, principalType: 'ServicePrincipal', roleDefinitionId: acrPush }
}
resource pullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, pullIdentity.id, acrPull)
  properties: { principalId: pullIdentity.properties.principalId, principalType: 'ServicePrincipal', roleDefinitionId: acrPull }
}
output clientId string = deployIdentity.properties.clientId
