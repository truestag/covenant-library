export const releaseProfile = Object.freeze({
  current: "2.0",
  stagedFor: "2.0",
  stagedInactive: false
});

export const featureFlags = Object.freeze({
  comparisonWorkspace: true,
  companionWitnesses: true,
  parallelPassageDetection: true,
  variantViewer: true,
  citationBuilder: true,
  researchCollections: true,
  passageBacklinks: true,
  readingPlans: true,
  concordance: true,
  provenanceInspector: true,
  researchBundleExport: true,
  localAiStudyAssistant: true
});

export const v2FeatureCatalog = Object.freeze([
  ["comparisonWorkspace", "Comparison Workspace"],
  ["companionWitnesses", "Companion witnesses"],
  ["parallelPassageDetection", "Parallel-passage detection"],
  ["variantViewer", "Variant viewer"],
  ["citationBuilder", "Citation builder"],
  ["researchCollections", "Research collections"],
  ["passageBacklinks", "Passage backlinks"],
  ["readingPlans", "Reading plans"],
  ["concordance", "Offline concordance"],
  ["provenanceInspector", "Source / provenance inspector"],
  ["researchBundleExport", "Research bundle export"],
  ["localAiStudyAssistant", "Optional local AI Study Assistant"]
]);

export const anyV2ResearchFeatureEnabled = () => v2FeatureCatalog.some(([id]) => featureFlags[id]);
