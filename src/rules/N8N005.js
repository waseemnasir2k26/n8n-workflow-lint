import { activeNodes, isHttp } from "../util.js";

export default {
  id: "N8N005",
  severity: "medium",
  title: "TLS certificate validation disabled",
  message: "HTTP Request ignores invalid TLS certificates.",
  fix: 'Turn off "Ignore SSL Issues" and install the correct CA certificate or fix the endpoint certificate.',
  why: "Disabling certificate checks removes the guarantee that you are talking to the intended server.",
  bad: '{ "parameters": { "options": { "allowUnauthorizedCerts": true } } }',
  good: '{ "parameters": { "options": {} } }',
  check(wf) {
    return activeNodes(wf)
      .filter(
        (n) =>
          isHttp(n) && n.parameters?.options?.allowUnauthorizedCerts === true,
      )
      .map((n) => ({ node: n.name }));
  },
};
