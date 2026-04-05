# google_sheets — Google Sheets OAuth2 Authentication

> serviceType: `google_sheets` | category: Productivity

## jsonSchema

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "Connection Name"
    }
  },
  "required": ["name"]
}
```

## uiSchema

```json
{
  "name": {
    "ui:placeholder": "e.g. 고객 A Google Sheets"
  },
  "ui:order": ["name"]
}
```

## 메모

- oauth2 인증 플로우는 Console이 처리 (Connect 버튼 → Google OAuth 팝업 → token 저장)
- Admin은 폼 구조만 정의. scope 등 oauth2 맥락은 Console/API Server가 알고 있음
- scope: `https://www.googleapis.com/auth/spreadsheets`
