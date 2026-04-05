#!/bin/bash
# DB 직접 접근 차단 — Console, Admin, FC용
# 이 레포는 메인 DB 접근을 API Server를 경유해야 합니다 (ADR-019)
#
# 차단 대상:
#   Edit/Write: 메인 Prisma 클라이언트(@prisma/client) 직접 import
#   Bash: prisma CLI 명령 전체 (schema generate 등)
#
# 허용 (ADR-019 예외):
#   @yourq/prisma-backoffice: Admin 템플릿 CRUD 전용 (Backoffice DB, 메인 DB 아님)
#   "prisma" 단어가 주석·문자열·경로에 등장하는 것

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# 차단 패턴: 메인 Prisma 직접 사용
# - @prisma/client (메인 Prisma 패키지)
# - 스코프 없는 prisma 경로 import
# 허용: @yourq/prisma-backoffice (Admin Backoffice DB 전용, 정책 예외)
MAIN_PRISMA_PATTERN='@prisma/client'

check_content() {
  local content="$1"
  # 1. @prisma/client 직접 import는 차단
  if echo "$content" | grep -qE "$MAIN_PRISMA_PATTERN"; then
    return 1
  fi
  # 2. @yourq/prisma-backoffice가 아닌 prisma 경로 import는 차단
  #    허용 예: from "@yourq/prisma-backoffice"
  #    차단 예: from "prisma", from "./prisma/client", require("prisma")
  local bad
  bad=$(echo "$content" | grep -oE "(from|require\s*\()\s*['\"][^'\"]*prisma[^'\"]*['\"]" || true)
  if [[ -n "$bad" ]]; then
    if echo "$bad" | grep -qvE "@yourq/prisma-backoffice"; then
      return 1
    fi
  fi
  return 0
}

case "$TOOL_NAME" in
  Bash)
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
    if [[ -z "$COMMAND" ]]; then
      exit 0
    fi
    # 허용: Backoffice 스키마 generate (ADR-019 예외)
    if echo "$COMMAND" | grep -qE 'prisma generate[^|&;]*--schema=prisma/backoffice'; then
      exit 0
    fi
    # 허용: 단순 조회용 명령 (ls/find/grep/cat 등 — 경로/내용에 prisma 문자열 포함)
    if echo "$COMMAND" | grep -qE '^(ls|find|grep|cat|head|tail|rg|stat|file|tree|wc)(\s|$)'; then
      exit 0
    fi
    # 허용: git 명령 (커밋 메시지에 prisma 문자열이 포함될 수 있음)
    if echo "$COMMAND" | grep -qE '^git(\s|$)'; then
      exit 0
    fi
    if echo "$COMMAND" | grep -qiE 'prisma'; then
      echo "차단: 이 레포에서 prisma CLI를 실행할 수 없습니다." >&2
      echo "DB 작업은 API Server가 담당합니다 (ADR-019)." >&2
      echo "예외: prisma generate --schema=prisma/backoffice/... 만 허용." >&2
      exit 2
    fi
    ;;

  Edit)
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
    if [[ -z "$CONTENT" ]]; then
      exit 0
    fi
    if ! check_content "$CONTENT"; then
      echo "차단: 이 레포에서 메인 Prisma를 직접 사용할 수 없습니다." >&2
      echo "메인 DB 접근은 API Server를 경유해야 합니다 (ADR-019)." >&2
      echo "예외: @yourq/prisma-backoffice (Admin 템플릿 CRUD) 허용." >&2
      exit 2
    fi
    ;;

  Write)
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
    if [[ -z "$CONTENT" ]]; then
      exit 0
    fi
    if ! check_content "$CONTENT"; then
      echo "차단: 이 레포에서 메인 Prisma를 직접 사용할 수 없습니다." >&2
      echo "메인 DB 접근은 API Server를 경유해야 합니다 (ADR-019)." >&2
      echo "예외: @yourq/prisma-backoffice (Admin 템플릿 CRUD) 허용." >&2
      exit 2
    fi
    ;;
esac

exit 0
