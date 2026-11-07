export function createAuditEmitter(audit) {
  return (event) => {
    if (audit === undefined) return;
    try {
      audit(event);
    } catch {
      // Audit delivery is best effort and cannot change the request outcome.
    }
  };
}
