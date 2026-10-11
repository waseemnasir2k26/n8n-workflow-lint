export default function json(report) {
  return JSON.stringify(report, null, 2) + "\n";
}
