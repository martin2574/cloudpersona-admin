# call_transfer — Call Transfer

> skillType: `call_transfer` | category: Telephony

## jsonSchema

```json
{
  "type": "object",
  "title": "Call Transfer",
  "description": "Transfer the call to an agent or another number",
  "required": ["destination_type"],
  "properties": {
    "destination_type": {
      "enum": ["phone", "sip"],
      "type": "string",
      "title": "Destination Type",
      "default": "phone",
      "enumNames": ["Phone", "SIP"]
    }
  },
  "dependencies": {
    "destination_type": {
      "oneOf": [
        {
          "properties": {
            "destination_type": { "enum": ["phone"] },
            "e164_number": {
              "type": "string",
              "title": "Phone Number",
              "pattern": "^\\+[1-9]\\d{1,14}$",
              "description": "E.164 format (e.g. +821012345678)"
            },
            "transfer_type": {
              "enum": ["cold", "warm"],
              "type": "string",
              "title": "Transfer Type",
              "default": "cold",
              "enumNames": ["Cold (immediate)", "Warm (announce first)"]
            },
            "timeout": {
              "type": "integer",
              "title": "Timeout (seconds)",
              "default": 20,
              "minimum": 5
            },
            "extension": {
              "type": "string",
              "title": "Extension (DTMF)",
              "pattern": "^[0-9*#]+$",
              "description": "Auto-dial after connect"
            },
            "message_to_customer": {
              "type": "string",
              "title": "Message to Customer",
              "description": "Played to the caller before transfer (e.g. \"Connecting you now\")"
            },
            "on_hold_music": {
              "enum": ["ringtone", "none"],
              "type": "string",
              "title": "On-hold Music",
              "default": "ringtone",
              "enumNames": ["Ringtone", "None"]
            }
          },
          "required": ["e164_number", "transfer_type", "timeout"],
          "dependencies": {
            "transfer_type": {
              "oneOf": [
                {
                  "properties": {
                    "transfer_type": { "enum": ["cold"] }
                  }
                },
                {
                  "properties": {
                    "transfer_type": { "enum": ["warm"] },
                    "warm_intro_type": {
                      "enum": ["fixed", "summary"],
                      "type": "string",
                      "title": "Intro Type",
                      "default": "fixed",
                      "enumNames": ["Fixed Message", "LLM Summary"]
                    }
                  },
                  "required": ["warm_intro_type"],
                  "dependencies": {
                    "warm_intro_type": {
                      "oneOf": [
                        {
                          "properties": {
                            "warm_intro_type": { "enum": ["fixed"] },
                            "warm_intro_text": {
                              "type": "string",
                              "title": "Intro Message",
                              "description": "Supports {{variables}}"
                            }
                          },
                          "required": ["warm_intro_text"]
                        },
                        {
                          "properties": {
                            "warm_intro_type": { "enum": ["summary"] },
                            "warm_intro_max_chars": {
                              "type": "integer",
                              "title": "Summary Max Characters",
                              "default": 50,
                              "minimum": 10
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        },
        {
          "properties": {
            "destination_type": { "enum": ["sip"] },
            "sip_address": {
              "type": "string",
              "title": "SIP URI",
              "description": "e.g. sip:agent@pbx.example.com"
            },
            "sip_auth_mode": {
              "enum": ["none", "credentials"],
              "type": "string",
              "title": "SIP Authentication",
              "default": "none",
              "enumNames": ["No Auth", "Use Connection"]
            },
            "transfer_type": {
              "enum": ["cold", "warm"],
              "type": "string",
              "title": "Transfer Type",
              "default": "cold",
              "enumNames": ["Cold (immediate)", "Warm (announce first)"]
            },
            "timeout": {
              "type": "integer",
              "title": "Timeout (seconds)",
              "default": 20,
              "minimum": 5
            },
            "extension": {
              "type": "string",
              "title": "Extension (DTMF)",
              "pattern": "^[0-9*#]+$",
              "description": "Auto-dial after connect"
            },
            "message_to_customer": {
              "type": "string",
              "title": "Message to Customer",
              "description": "Played to the caller before transfer (e.g. \"Connecting you now\")"
            },
            "on_hold_music": {
              "enum": ["ringtone", "none"],
              "type": "string",
              "title": "On-hold Music",
              "default": "ringtone",
              "enumNames": ["Ringtone", "None"]
            }
          },
          "required": ["sip_address", "transfer_type", "timeout"],
          "dependencies": {
            "sip_auth_mode": {
              "oneOf": [
                {
                  "properties": {
                    "sip_auth_mode": { "enum": ["none"] }
                  }
                },
                {
                  "properties": {
                    "sip_auth_mode": { "enum": ["credentials"] },
                    "sip_connection_id": {
                      "type": "string",
                      "title": "SIP Connection"
                    }
                  },
                  "required": ["sip_connection_id"]
                }
              ]
            },
            "transfer_type": {
              "oneOf": [
                {
                  "properties": {
                    "transfer_type": { "enum": ["cold"] }
                  }
                },
                {
                  "properties": {
                    "transfer_type": { "enum": ["warm"] },
                    "warm_intro_type": {
                      "enum": ["fixed", "summary"],
                      "type": "string",
                      "title": "Intro Type",
                      "default": "fixed",
                      "enumNames": ["Fixed Message", "LLM Summary"]
                    }
                  },
                  "required": ["warm_intro_type"],
                  "dependencies": {
                    "warm_intro_type": {
                      "oneOf": [
                        {
                          "properties": {
                            "warm_intro_type": { "enum": ["fixed"] },
                            "warm_intro_text": {
                              "type": "string",
                              "title": "Intro Message",
                              "description": "Supports {{variables}}"
                            }
                          },
                          "required": ["warm_intro_text"]
                        },
                        {
                          "properties": {
                            "warm_intro_type": { "enum": ["summary"] },
                            "warm_intro_max_chars": {
                              "type": "integer",
                              "title": "Summary Max Characters",
                              "default": 50,
                              "minimum": 10
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    }
  }
}
```

## uiSchema

```json
{
  "ui:order": [
    "destination_type",
    "sip_address",
    "e164_number",
    "sip_auth_mode",
    "sip_connection_id",
    "message_to_customer",
    "transfer_type",
    "on_hold_music",
    "warm_intro_type",
    "warm_intro_text",
    "warm_intro_max_chars",
    "extension",
    "timeout"
  ],
  "destination_type": {
    "ui:widget": "radio"
  },
  "sip_auth_mode": {
    "ui:widget": "radio"
  },
  "transfer_type": {
    "ui:widget": "radio"
  },
  "on_hold_music": {
    "ui:widget": "radio"
  },
  "warm_intro_type": {
    "ui:widget": "radio"
  },
  "warm_intro_text": {
    "ui:widget": "textarea",
    "ui:options": {
      "rows": 3
    }
  },
  "message_to_customer": {
    "ui:widget": "textarea",
    "ui:options": {
      "rows": 2
    }
  },
  "sip_connection_id": {
    "ui:widget": "connectionPicker",
    "ui:options": {
      "serviceType": "sip_auth"
    }
  }
}
```
