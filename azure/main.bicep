@description('Location for all resources')
param location string = 'eastus'

@description('Azure Container App name')
param appName string = 'smart-cv-app'

@description('Container image tag to deploy')
param imageTag string = 'latest'

@description('Minimum Container App replicas')
param minReplicas int = 0

@description('Maximum Container App replicas')
param maxReplicas int = 3

@description('Container CPU cores')
param cpu string = '0.5'

@description('Container memory')
param memory string = '1Gi'

var environmentName = '${appName}-env'
var acrName = replace('${appName}acr', '-', '')
var imageName = '${containerRegistry.properties.loginServer}/${appName}:${imageTag}'

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {}
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'smart-cv'
          image: imageName
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ASPNETCORE_HTTP_PORTS'
              value: '8080'
            }
          ]
          resources: {
            cpu: json(cpu)
            memory: memory
          }
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output acrLoginServer string = containerRegistry.properties.loginServer
