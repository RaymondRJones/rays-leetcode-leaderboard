let catalogPromise;

async function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(chrome.runtime.getURL("assets/problem-catalog.json"))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Catalog request failed with ${response.status}.`);
        }
        return response.json();
      })
      .then((catalog) => {
        const problems = Array.isArray(catalog.problems) ? catalog.problems : [];
        return {
          ...catalog,
          bySlug: new Map(problems.map((problem) => [problem.slug, problem]))
        };
      });
  }

  return catalogPromise;
}

export async function lookupProblem(slug) {
  const catalog = await loadCatalog();
  return catalog.bySlug.get(slug) || null;
}

export async function getCatalogMetadata() {
  const catalog = await loadCatalog();
  return {
    schemaVersion: catalog.schemaVersion,
    source: catalog.source,
    problemCount: catalog.problems.length
  };
}
