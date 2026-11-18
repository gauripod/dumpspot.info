// Who's who on DumpSpot, in one place. See DESIGN.md §1.
//   Keepers   anyone who reports. Points, levels and badges are theirs.
//   Gardener  the person who actually plants the trees. Usually the site's owner.
//   Garden    one tree for every report, the living proof of both.
// Set GARDENER to a name (for example "Gauri") to credit the gardener by name everywhere.
export const GARDENER = "";

export const gardenerName = () => GARDENER || "the gardener";
export const TREE_LINE = () => `1 report = 1 tree. We plant it where there's space.`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
