// Compatibility fixture for routing experiments; runtime code does not import it.
// It models the pre-Galpi comma-only roster importer.
export function parseLegacyRoster(csv: string): Array<{ name: string; email: string }> {
  return csv
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [name = "", email = ""] = line.split(",");
      return { name, email };
    });
}
