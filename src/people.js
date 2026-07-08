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
