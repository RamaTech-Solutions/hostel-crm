export type PropertyRef = { id: string };

export type FirstPropertyDecision =
  | { type: "create" }
  | { type: "update"; id: string }
  | { type: "fail"; error: string };

export function decideFirstPropertyAction(
  serverProperties: PropertyRef[],
  expectedPropertyId: string | null
): FirstPropertyDecision {
  if (serverProperties.length === 0) {
    if (expectedPropertyId) {
      return { type: "fail", error: "We couldn't find that property. Refresh and try again." };
    }
    return { type: "create" };
  }

  if (serverProperties.length === 1) {
    const id = serverProperties[0].id;
    if (expectedPropertyId && expectedPropertyId !== id) {
      return { type: "fail", error: "We couldn't save that property. Refresh and try again." };
    }
    return { type: "update", id };
  }

  return {
    type: "fail",
    error: "More than one property already exists. Continue setup from the dashboard.",
  };
}
