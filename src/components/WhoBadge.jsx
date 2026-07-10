import { resolvePersonId, personColor } from '../people.js';

// Colored badge for who paid an expense/consumable. Shows ⚠️ when the stored
// payer no longer matches any known person (such entries count as the manager's
// in the income distribution).
export default function WhoBadge({ people, paidBy }) {
  const pid = resolvePersonId(people, paidBy);
  if (!pid) {
    return (
      <span
        title={`Unknown payer${paidBy ? ` "${paidBy}"` : ''} — counted as manager`}
        className="text-base leading-none"
      >
        ⚠️
      </span>
    );
  }
  const person = people.find(p => p.id === pid);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${personColor(people, pid)}`}>
      {person.name}
    </span>
  );
}
