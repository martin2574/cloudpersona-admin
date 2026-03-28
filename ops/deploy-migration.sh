#!/bin/bash
set -euo pipefail

# ============================================
#  Backoffice DB Migration 배포 (사람 전용)
#  AI 실행 불가: read -p 대화형 입력 필수
# ============================================

cd "$(dirname "$0")/.."

# .env에서 BACKOFFICE_DATABASE_URL 로드
if [ -f .env ]; then
  export $(grep '^BACKOFFICE_DATABASE_URL=' .env | xargs)
fi

if [ -z "${BACKOFFICE_DATABASE_URL:-}" ]; then
  echo "오류: BACKOFFICE_DATABASE_URL이 설정되지 않았습니다."
  exit 1
fi

echo "============================================"
echo "  Backoffice DB Migration 배포"
echo "  대상: $(echo "$BACKOFFICE_DATABASE_URL" | sed 's/:[^:@]*@/:***@/')"
echo "============================================"
echo ""

# 현재 migration 상태 표시
npx prisma migrate status --schema prisma/backoffice/schema.prisma

echo ""
read -p "위 migration을 Backoffice DB에 적용합니다. 계속하시겠습니까? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "취소되었습니다."
  exit 1
fi

# Backoffice DB에 migration 적용
npx prisma migrate deploy --schema prisma/backoffice/schema.prisma

echo ""
echo "✓ Backoffice DB migration 적용 완료"
