export type AmplifyDependentResourcesAttributes = {
  "api": {
    "textGenAPI": {
      "ApiId": "string",
      "ApiName": "string",
      "RootUrl": "string"
    },
    "textGenerationAPI": {
      "ApiId": "string",
      "ApiName": "string",
      "RootUrl": "string"
    }
  },
  "function": {
    "BedrockCharacterDemoGenerateText": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "KendraBackedChatBotGenerationFunction": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    }
  }
}