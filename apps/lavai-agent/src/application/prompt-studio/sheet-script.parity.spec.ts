import { readFileSync } from 'fs';
import { join } from 'path';

import { allSheetKeys, scriptFor } from './sheet-script';

describe('sheet-script parity with lavperform-app', () => {
  const clientPath = join(
    __dirname,
    '../../../../lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/sheet-script.ts',
  );
  const apiKeysPath = join(
    __dirname,
    '../../../../api-lavperform/src/ai-agent/application/dto/put-prompt-sheet-answer.dto.ts',
  );

  function extractFields(source: string): Array<{ key: string; label: string }> {
    const fields: Array<{ key: string; label: string }> = [];
    const re = /(?:cadastroField|asked)\(\s*'([^']+)'\s*,\s*'([^']+)'/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      fields.push({ key: match[1], label: match[2] });
    }
    return fields;
  }

  function extractApiKeys(source: string): string[] {
    const block = source.match(/PROMPT_SHEET_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
    if (!block) return [];
    return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }

  it('client key order and labels match the server script', () => {
    const clientSource = readFileSync(clientPath, 'utf8');
    const clientFields = extractFields(clientSource);
    const serverByKey = new Map<string, string>();
    for (const model of ['CONVENTIONAL', 'SELF_SERVICE'] as const) {
      for (const field of scriptFor(model)) {
        serverByKey.set(field.key, field.label);
      }
    }

    expect(clientFields.map((f) => f.key)).toEqual(allSheetKeys());
    expect(clientFields.map((f) => ({ key: f.key, label: f.label }))).toEqual(
      allSheetKeys().map((key) => ({ key, label: serverByKey.get(key)! })),
    );
    expect(
      scriptFor('SELF_SERVICE').some((f) => f.key === 'pieceBlanket' && f.label === 'Cobertor'),
    ).toBe(true);
  });

  it('api PutPromptSheetAnswerDto keys match allSheetKeys', () => {
    const apiSource = readFileSync(apiKeysPath, 'utf8');
    expect(extractApiKeys(apiSource)).toEqual(allSheetKeys());
  });
});
