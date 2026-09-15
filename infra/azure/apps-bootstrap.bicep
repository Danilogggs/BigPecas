@allowed(['dev', 'test', 'prod'])
param environment string
param location string = resourceGroup().location

var prefix = 'bigpecas-${environment}'
var tags = { project: 'BigPecas', environment: environment, managedBy: 'Bicep' }
resource hosting 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: 'cae-${prefix}'
}

resource backend 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'api-${prefix}'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: hosting.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 80, transport: 'http', allowInsecure: false }
    }
    template: {
      containers: [{
        name: 'api'
        image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
        resources: { cpu: json('0.25'), memory: '0.5Gi' }
      }]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

resource frontend 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'web-${prefix}'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: hosting.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 80, transport: 'http', allowInsecure: false }
    }
    template: {
      containers: [{
        name: 'web'
        image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
        resources: { cpu: json('0.25'), memory: '0.5Gi' }
      }]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}
