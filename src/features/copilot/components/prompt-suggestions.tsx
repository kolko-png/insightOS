const SUGGESTIONS = [
  'Why did our revenue decrease last month?',
  'Which supplier caused delivery delays?',
  'Show all invoices above $5,000',
  'Predict next month\u2019s sales',
];

export function PromptSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-[13px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
