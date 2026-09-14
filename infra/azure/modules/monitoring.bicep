param environment string
param location string
param alertEmail string
var prefix = 'bigpecas-${environment}'
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = { name: 'log-${prefix}' }
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'alerts-${prefix}'
  location: 'global'
  properties: {
    groupShortName: 'bp-${environment}'
    enabled: true
    emailReceivers: [{ name: 'responsavel', emailAddress: alertEmail, useCommonAlertSchema: true }]
  }
}
resource errorAlert 'Microsoft.Insights/scheduledQueryRules@2022-06-15' = {
  name: 'errors-${prefix}'
  location: location
  properties: {
    displayName: 'BigPecas ${environment}: erros no backend'
    description: 'Investigar logs e ultima versao implantada; consultar docs/devops/azure.md.'
    enabled: true
    severity: 2
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    scopes: [logs.id]
    skipQueryValidation: true
    criteria: { allOf: [{
      query: 'ContainerAppConsoleLogs_CL | where ContainerAppName_s == "api-${prefix}" | extend entry=parse_json(Log_s) | where tostring(entry.level) == "error"'
      timeAggregation: 'Count'
      operator: 'GreaterThanOrEqual'
      threshold: 1
      failingPeriods: { numberOfEvaluationPeriods: 1, minFailingPeriodsToAlert: 1 }
    }] }
    actions: { actionGroups: [actionGroup.id] }
    autoMitigate: true
  }
}
resource workbook 'Microsoft.Insights/workbooks@2022-04-01' = {
  name: guid(resourceGroup().id, 'observability')
  location: location
  kind: 'shared'
  properties: {
    displayName: 'BigPecas ${environment} - operacao'
    category: 'workbook'
    sourceId: logs.id
    serializedData: string({
      version: 'Notebook/1.0'
      items: [
        { type: 1, content: { json: '# BigPecas ${environment}\nLogs, erros e latencia HTTP. Consulte tambem Metrics nas Container Apps para CPU, memoria e replicas.' }, name: 'intro' }
        { type: 3, name: 'http', content: {
          version: 'KqlItem/1.0'
          query: 'ContainerAppConsoleLogs_CL | extend e=parse_json(Log_s) | where tostring(e.message) == "http_request" | summarize requests=count(), errors=countif(toint(e.statusCode)>=500), p95_ms=percentile(todouble(e.durationMs),95) by bin(TimeGenerated,5m)'
          queryType: 0
          resourceType: 'microsoft.operationalinsights/workspaces'
          crossComponentResources: [logs.id]
          visualization: 'timechart'
          title: 'Requisicoes e latencia'
          timeContext: { durationMs: 3600000 }
        } }
      ]
      isLocked: false
      fallbackResourceIds: [logs.id]
    })
  }
}
