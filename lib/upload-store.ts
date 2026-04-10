// Module-level singleton — survives client-side navigation within the session.
// Avoids polluting window and provides a typed, tree-shakeable interface.
export const uploadStore: { pendingFile: File | null } = { pendingFile: null }
