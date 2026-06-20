'use client';
import { useTranslations } from 'next-intl';

interface QuestionCardProps {
  questionId: string;
  questionText: string;
  currentScore: number | undefined;
  onAnswer: (score: number) => void;
}

const SCORES = [1, 2, 3, 4, 5];

export default function QuestionCard({
  questionText,
  currentScore,
  onAnswer,
}: QuestionCardProps) {
  const tScale = useTranslations('bigfive.scale');

  return (
    <div
      className="p-5 rounded-2xl"
      style={{
        background: 'hsl(var(--card))',
        border: `1px solid ${currentScore !== undefined
          ? 'hsl(var(--foreground) / 0.2)'
          : 'hsl(var(--border))'}`,
      }}
    >
      <p
        className="text-sm font-light leading-relaxed mb-5"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        {questionText}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs flex-shrink-0"
          style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
        >
          {tScale('disagree')}
        </span>

        <div className="flex items-center gap-2 flex-1 justify-center">
          {SCORES.map(score => (
            <button
              key={score}
              onClick={() => onAnswer(score)}
              className="rounded-full transition-all duration-200 flex items-center justify-center"
              style={{
                width: score === 3 ? 32 : 28,
                height: score === 3 ? 32 : 28,
                background: currentScore === score
                  ? 'hsl(var(--foreground))'
                  : 'hsl(var(--muted))',
                color: currentScore === score
                  ? 'hsl(var(--background))'
                  : 'hsl(var(--muted-foreground))',
                transform: currentScore === score ? 'scale(1.1)' : 'scale(1)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {score}
            </button>
          ))}
        </div>

        <span
          className="text-xs flex-shrink-0"
          style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
        >
          {tScale('agree')}
        </span>
      </div>
    </div>
  );
}
