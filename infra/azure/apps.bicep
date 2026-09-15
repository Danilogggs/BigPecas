@allowed(['dev', 'test', 'prod'])
param environment string
param location string = resourceGroup().location
param backendImage string
param frontendImage string
@description('Cria inicialmente os Container Apps com imagem publica para associar a identidade antes do ACR privado.')
param bootstrapIdentity bool = false
param supabaseUrl string
@secure()
param supabaseAnonKey string
@secure()
param supabaseServiceRoleKey string
param alertEmail string
@secure()
param shippingToken string = ''
param shippingUrl string = 'https://sandbox.melhorenvio.com.br'
@minValue(0)
@maxValue(1)
param minReplicas int = 0

var prefix = 'bigpecas-${environment}'
resource hosting 'Microsoft.App/managedEnvironments@2024-03-01' existing = { name: 'cae-${prefix}' }
resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = { name: 'bp${environment}${uniqueString(resourceGroup().id)}' }
resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = { name: 'id-${prefix}-pull' }
var webUrl = 'https://web-${prefix}.${hosting.properties.defaultDomain}'
var commonTags = { project: 'BigPecas', environment: environment, managedBy: 'Bicep' }
var backendProbes = [for kind in ['Liveness', 'Readiness', 'Startup']: {
  type: kind
  httpGet: { path: '/api/health', port: 3001, scheme: 'HTTP' }
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: kind == 'Startup' ? 30 : 3
}]

resource backend 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'api-${prefix}'
  location: location
  tags: commonTags
  identity: { type: 'UserAssigned', userAssignedIdentities: { '${pullIdentity.id}': {} } }
  properties: {
    managedEnvironmentId: hosting.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: bootstrapIdentity ? 80 : 3001, transport: 'http', allowInsecure: false }
      registries: bootstrapIdentity ? [] : [{ server: registry.properties.loginServer, identity: pullIdentity.id }]
      secrets: concat([
        { name: 'supabase-anon', value: supabaseAnonKey }
        { name: 'supabase-service-role', value: supabaseServiceRoleKey }
      ], empty(shippingToken) ? [] : [{ name: 'shipping-token', value: shippingToken }])
    }
    template: {
      containers: [{
        name: 'api'
        image: bootstrapIdentity ? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' : backendImage
        resources: { cpu: json('0.25'), memory: '0.5Gi' }
        env: concat([
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: '3001' }
          { name: 'FRONTEND_URL', value: webUrl }
          { name: 'TRUST_PROXY', value: '1' }
          { name: 'INITIALIZE_DATABASE_DATA', value: 'false' }
          { name: 'SUPABASE_URL', value: supabaseUrl }
          { name: 'SUPABASE_ANON_KEY', secretRef: 'supabase-anon' }
          { name: 'SUPABASE_SERVICE_ROLE_KEY', secretRef: 'supabase-service-role' }
          { name: 'SUPABASE_EMAIL_CONFIRM_REDIRECT_TO', value: '${webUrl}/login?emailConfirmado=1' }
          { name: 'EMAIL_NOTIFICACAO_VENDA_ENABLED', value: 'false' }
          { name: 'MELHOR_ENVIO_URL', value: shippingUrl }
        ], empty(shippingToken) ? [] : [{ name: 'MELHOR_ENVIO_ACCESS_TOKEN', secretRef: 'shipping-token' }])
        probes: bootstrapIdentity ? [] : backendProbes
      }]
      scale: { minReplicas: minReplicas, maxReplicas: 1, rules: [{ name: 'http', http: { metadata: { concurrentRequests: '20' } } }] }
    }
  }
}
resource frontend 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'web-${prefix}'
  location: location
  tags: commonTags
  identity: { type: 'UserAssigned', userAssignedIdentities: { '${pullIdentity.id}': {} } }
  properties: {
    managedEnvironmentId: hosting.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 80, transport: 'http', allowInsecure: false }
      registries: bootstrapIdentity ? [] : [{ server: registry.properties.loginServer, identity: pullIdentity.id }]
    }
    template: {
      containers: [{
        name: 'web'
        image: bootstrapIdentity ? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' : frontendImage
        resources: { cpu: json('0.25'), memory: '0.5Gi' }
        probes: bootstrapIdentity ? [] : [{ type: 'Readiness', httpGet: { path: '/', port: 80 }, periodSeconds: 10 }]
      }]
      scale: { minReplicas: minReplicas, maxReplicas: 1, rules: [{ name: 'http', http: { metadata: { concurrentRequests: '20' } } }] }
    }
  }
}
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-${environment}'
  params: { environment: environment, location: location, alertEmail: alertEmail }
}
output frontendUrl string = webUrl
output backendUrl string = 'https://${backend.properties.configuration.ingress.fqdn}'
