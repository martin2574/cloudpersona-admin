# custom_api — HTTP Request Authentication

> serviceType: `custom_api` | authType: `api_key`, `bearer`, `basic`

## jsonSchema

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "Connection Name"
    },
    "authType": {
      "type": "string",
      "title": "Authentication Type",
      "enum": ["api_key", "bearer", "basic"]
    }
  },
  "required": ["name", "authType"],
  "dependencies": {
    "authType": {
      "oneOf": [
        {
          "properties": {
            "authType": { "enum": ["api_key"] },
            "apiKey": { "type": "string", "title": "API Key" },
            "headerName": { "type": "string", "title": "Header Name", "default": "X-API-Key" },
            "placement": { "type": "string", "title": "Placement", "enum": ["header", "query"], "default": "header" }
          },
          "required": ["apiKey"]
        },
        {
          "properties": {
            "authType": { "enum": ["bearer"] },
            "token": { "type": "string", "title": "Token" }
          },
          "required": ["token"]
        },
        {
          "properties": {
            "authType": { "enum": ["basic"] },
            "username": { "type": "string", "title": "Username" },
            "password": { "type": "string", "title": "Password" }
          },
          "required": ["username", "password"]
        }
      ]
    }
  }
}
```

## uiSchema

```json
{
  "name": {
    "ui:placeholder": "e.g. Marketing API"
  },
  "authType": {
    "ui:widget": "select"
  },
  "apiKey": {
    "ui:widget": "password"
  },
  "token": {
    "ui:widget": "password"
  },
  "password": {
    "ui:widget": "password"
  },
  "headerName": {
    "ui:placeholder": "X-API-Key"
  },
  "ui:order": [
    "name",
    "authType",
    "apiKey", "headerName", "placement",
    "token",
    "username", "password"
  ]
}
```
