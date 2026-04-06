import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommended],
    rules: {
      // C2-1: any 사용 금지 (KB #161)
      "@typescript-eslint/no-explicit-any": "error",

      // C2-2: API 수동 interface 선언 차단 (KB #161)
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "TSInterfaceDeclaration[id.name=/.*(Body|Request|Response|Payload)$/]",
          message:
            "API 타입은 src/types/api-types.ts에서 import. 수동 interface 선언 금지. (KB #161)",
        },
      ],
    },
  },
  {
    // 자동 생성 파일 + 테스트는 lint 제외
    ignores: ["src/types/api-types.ts", "tests/**", "dist/**"],
  },
);
