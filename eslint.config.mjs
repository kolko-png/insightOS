import { FlatCompat } from '@eslint/eslintrc';
import boundaries from 'eslint-plugin-boundaries';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * The boundaries rule enforced here is the one flagged back in
 * Phase 2: feature-based structure only stays clean if
 * features/* never import directly from another features/* — that
 * kind of cross-feature reach-in is exactly how "independent"
 * features quietly end up coupled. Shared logic belongs in
 * lib/services (workspace-context.service.ts is the canonical
 * example — used by dashboard, copilot, documents, analytics, and
 * automation, none of which import each other).
 *
 * VERIFY BEFORE RELYING ON THIS: the `!${from.featureName}`
 * negated-capture syntax below is eslint-plugin-boundaries'
 * documented way to express "same element type, different instance"
 * — confirm it still matches the installed plugin version's syntax,
 * since rule-config DSLs like this one are exactly the kind of
 * detail that drifts between major versions.
 */
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'feature', pattern: 'src/features/*', mode: 'folder', capture: ['featureName'] },
        { type: 'app', pattern: 'src/app/**' },
        { type: 'lib', pattern: 'src/lib/**' },
        { type: 'components', pattern: 'src/components/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'feature',
              disallow: [['feature', { featureName: '!${from.featureName}' }]],
              message:
                'Features may not import directly from other features. Move shared logic to lib/services instead (see Phase 2 rationale).',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
