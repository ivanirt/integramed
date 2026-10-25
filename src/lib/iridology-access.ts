/**
 * The iris screen belongs to the iridology modality. There is no separate
 * `iris` module toggle. A clinic-modules payload saved by an earlier build
 * may still contain `iris: true`; that counts as on until the catalog is saved.
 */

export type ModalityFlag = { id: string; enabled: boolean };

export type IridologyAccess = {
  enabled: boolean;
  /** Old `iris: true` is keeping the screen on while the catalog has iridology off. */
  legacyConflict: boolean;
};

export function resolveIridologyAccess(
  modules: Record<string, boolean | undefined> | null | undefined,
  modalities: ModalityFlag[] | null | undefined,
): IridologyAccess {
  const legacyOn = modules?.iris === true;
  const item = modalities?.find((modality) => modality.id === "iridology");
  const catalogOn = item?.enabled === true;
  return {
    enabled: catalogOn || legacyOn,
    legacyConflict: legacyOn && !catalogOn,
  };
}

export function withoutLegacyIrisFlag(modules: Record<string, boolean>): Record<string, boolean> {
  if (!Object.prototype.hasOwnProperty.call(modules, "iris")) return modules;
  const next = { ...modules };
  delete next.iris;
  return next;
}
