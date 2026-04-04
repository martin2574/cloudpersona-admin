#!/bin/bash
# DB 직접 접근 차단 — Console, Admin, FC용
# 이 레포는 API Server를 경유해야 합니다 (ADR-019)
#
# 차단 대상:
#   Edit/Write: @prisma/client import, PrismaClient 사용
#   Bash: prisma CLI 명령 전체
#
# 허용:
#   "prisma" 단어가 주석·문자열에 등장하는 것 (import/require 패턴만 차단)

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

case "$TOOL_NAME" in
  Bash)
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
    if [[ -z "$COMMAND" ]]; then
      exit 0
    fi
    if echo "$COMMAND" | grep -qiE 'prisma'; then
      echo "차단: 이 레포에서 prisma CLI를 실행할 수 없습니다." >&2
      echo "DB 작업은 API Server가 담당합니다 (ADR-019)." >&2
      exit 2
    fi
    ;;

  Edit)
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
    if [[ -z "$CONTENT" ]]; then
      exit 0
    fi
    if echo "$CONTENT" | grep -qE "@prisma/client|PrismaClient|from ['\"].*prisma|require\(.*prisma"; then
      echo "차단: 이 레포에서 Prisma를 직접 사용할 수 없습니다." >&2
      echo "DB 접근은 API Server를 경유해야 합니다 (ADR-019)." >&2
      exit 2
    fi
    ;;

  Write)
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
    if [[ -z "$CONTENT" ]]; then
      exit 0
    fi
    if echo "$CONTENT" | grep -qE "@prisma/client|PrismaClient|from ['\"].*prisma|require\(.*prisma"; then
      echo "차단: 이 레포에서 Prisma를 직접 사용할 수 없습니다." >&2
      echo "DB 접근은 API Server를 경유해야 합니다 (ADR-019)." >&2
      exit 2
    fi
    ;;
esac

exit 0
