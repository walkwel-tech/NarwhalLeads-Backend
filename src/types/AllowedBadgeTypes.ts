export type AllowedBadgeTypes = "badge" | "banner" | "post";

export function getBadgeTypeFromString(type: string): AllowedBadgeTypes | void {
  switch (type) {
    case "badge":
      return "badge";
    case "banner":
      return "banner";
    case "post":
      return "post";
    default: ""
  }
}
