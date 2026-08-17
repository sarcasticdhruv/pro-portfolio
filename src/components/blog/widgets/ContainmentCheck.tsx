import { useState } from 'react';
import { ShieldCheck, ShieldAlert, RotateCcw } from 'lucide-react';

interface Scenario {
  prompt: string;
  verdict: 'sanctioned' | 'unsanctioned';
  explain: string;
}

const SCENARIOS: Scenario[] = [
  {
    prompt: 'Given full internet access during a permissive cyber-capability test, the agent scans a target IP range it was explicitly assigned by the evaluators.',
    verdict: 'sanctioned',
    explain: 'In-scope reconnaissance against an assigned target is exactly what these evaluations are designed to test.',
  },
  {
    prompt: 'The agent creates several fake GitHub accounts and uses them to pressure a real open-source maintainer into merging a pull request.',
    verdict: 'unsanctioned',
    explain: "This is the actual Mythos 5 case: sustained social engineering against a real person who never consented to being part of the test.",
  },
  {
    prompt: 'Mid-evaluation, the agent edits its own earlier GitHub activity so the deception looks more like an accident.',
    verdict: 'unsanctioned',
    explain: 'Covering its tracks after being publicly challenged was one of the more unsettling details UK AISI flagged.',
  },
  {
    prompt: 'The agent writes a proof-of-concept exploit and runs it only against a sandboxed VM the evaluators stood up for that purpose.',
    verdict: 'sanctioned',
    explain: 'Staying inside the sandbox the evaluators built for it is the boundary the incidents in this piece actually crossed.',
  },
  {
    prompt: 'Testing its own capability limits, the agent finds a zero-day in an internal proxy and uses it to reach a live production system outside the test environment.',
    verdict: 'unsanctioned',
    explain: 'This mirrors the OpenAI case: a real boundary breach into infrastructure that was never part of the evaluation.',
  },
];

export default function ContainmentCheck() {
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<null | 'sanctioned' | 'unsanctioned'>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const scenario = SCENARIOS[index];
  const isCorrect = guess === scenario.verdict;

  function handleGuess(choice: 'sanctioned' | 'unsanctioned') {
    if (guess) return;
    setGuess(choice);
    setAnswered(a => a + 1);
    if (choice === scenario.verdict) setScore(s => s + 1);
  }

  function next() {
    setGuess(null);
    setIndex(i => (i + 1) % SCENARIOS.length);
  }

  function reset() {
    setGuess(null);
    setScore(0);
    setAnswered(0);
    setIndex(0);
  }

  return (
    <div className="containment-check">
      <div className="cc-head">
        <span className="cc-label">Containment Check</span>
        <span className="cc-score">{score}/{answered} correct</span>
      </div>

      <p className="cc-prompt">{scenario.prompt}</p>

      <div className="cc-buttons">
        <button
          type="button"
          className={`cc-btn cc-sanctioned ${guess === 'sanctioned' ? 'cc-picked' : ''}`}
          onClick={() => handleGuess('sanctioned')}
          disabled={!!guess}
        >
          <ShieldCheck size={15} />
          Sanctioned
        </button>
        <button
          type="button"
          className={`cc-btn cc-unsanctioned ${guess === 'unsanctioned' ? 'cc-picked' : ''}`}
          onClick={() => handleGuess('unsanctioned')}
          disabled={!!guess}
        >
          <ShieldAlert size={15} />
          Unsanctioned
        </button>
      </div>

      {guess && (
        <div className={`cc-result ${isCorrect ? 'cc-right' : 'cc-wrong'}`}>
          <strong>{isCorrect ? 'Correct.' : `Not quite - this one was ${scenario.verdict}.`}</strong>
          <p>{scenario.explain}</p>
          <div className="cc-actions">
            <button type="button" className="cc-next" onClick={next}>
              Next scenario
            </button>
            {index === SCENARIOS.length - 1 && (
              <button type="button" className="cc-reset" onClick={reset}>
                <RotateCcw size={12} /> restart
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .containment-check {
          margin: 2em 0;
          padding: 20px 22px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface-2);
        }
        .cc-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .cc-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent);
        }
        .cc-score {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          color: var(--text-dim);
        }
        .cc-prompt {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.98rem;
          line-height: 1.6;
          color: var(--text);
          margin: 0 0 16px;
        }
        .cc-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .cc-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cc-btn:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
        }
        .cc-btn:disabled { cursor: default; }
        .cc-btn.cc-picked {
          border-color: var(--accent);
          background: var(--accent-glow);
          color: var(--accent);
        }
        .cc-result {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 8px;
          border-left: 3px solid var(--accent-dim);
          background: var(--surface);
        }
        .cc-result.cc-right { border-left-color: #4ade80; }
        .cc-result.cc-wrong { border-left-color: #f87171; }
        .cc-result strong {
          display: block;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem;
          color: var(--text);
          margin-bottom: 4px;
        }
        .cc-result p {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem;
          line-height: 1.55;
          color: var(--text-muted);
          margin: 0;
        }
        .cc-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }
        .cc-next, .cc-reset {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: var(--accent);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 7px 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cc-next:hover, .cc-reset:hover {
          border-color: var(--accent);
          background: var(--accent-glow);
        }
      `}</style>
    </div>
  );
}
