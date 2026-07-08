// Everyone who can hold an ownership share or pay for an expense: each distinct
// apartment owner plus the manager. IDs are stable so they can be referenced from
// expenses/consumables (paidBy) and ownership shares — an owner's ID is their name,
// the manager's ID is the literal 'manager'.
export function buildPeople(apartments, manager) {
  const ownerNames = [...new Set(apartments.map(a => a.owner).filter(Boolean))];
  return [
    ...ownerNames.map(name => ({ id: name, name, role: 'owner' })),
    ...(manager?.name ? [{ id: 'manager', name: manager.name, role: 'manager' }] : []),
  ];
}

// Resolve a stored paidBy reference to a canonical person id, or null if it matches
// nobody. paidBy is normally a person id ('manager' or an owner's name), but older
// data may hold the manager's display name (e.g. 'Ilias') instead of 'manager'.
export function resolvePersonId(people, ref) {
  if (!ref) return null;
  const match = people.find(p => p.id === ref || p.name === ref);
  return match ? match.id : null;
}
