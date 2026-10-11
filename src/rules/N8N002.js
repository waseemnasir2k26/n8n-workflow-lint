export default {
  id: "N8N002",
  severity: "high",
  title: "pinData leaked in the export",
  message: "Export contains pinData (saved sample data).",
  fix: 'Unpin data in the editor (or delete the "pinData" key) before sharing or committing the workflow.',
  why: "Pinned data is real execution output. It often contains customer emails, tokens and API responses.",
  bad: '{ "pinData": { "Webhook": [ { "json": { "email": "..." } } ] } }',
  good: '{ "nodes": [ ... ], "connections": { ... } }',
  check(wf) {
    const pins =
      wf.pinData && typeof wf.pinData === "object"
        ? Object.entries(wf.pinData)
        : [];
    const real = pins.filter(([, v]) => (Array.isArray(v) ? v.length : v));
    if (!real.length) return [];
    const items = real.reduce(
      (a, [, v]) => a + (Array.isArray(v) ? v.length : 1),
      0,
    );
    return [
      {
        message: `pinData present on ${real.length} node(s) (${items} item(s)): ${real
          .map(([k]) => k)
          .slice(0, 5)
          .join(", ")}.`,
      },
    ];
  },
};
