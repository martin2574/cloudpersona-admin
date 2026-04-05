# sip_auth — SIP Call Transfer Authentication

> serviceType: `sip_auth` | category: Telephony

## jsonSchema

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "Connection Name"
    },
    "username": {
      "type": "string",
      "title": "Username"
    },
    "password": {
      "type": "string",
      "title": "Password"
    }
  },
  "required": ["name", "username", "password"]
}
```

## uiSchema

```json
{
  "name": {
    "ui:placeholder": "e.g. PBX Transfer"
  },
  "password": {
    "ui:widget": "password"
  },
  "ui:order": ["name", "username", "password"]
}
```
