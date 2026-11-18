// DumpSpot identity. See DESIGN.md §3.
//
//   Mark      Spot, the street dog who finds dump spots. The drawing is OpenMoji's "dog face"
//             (U+1F436) by the OpenMoji project, CC BY-SA 4.0, recoloured: white fur, ink line, a cyanotype-blue ear,
//             a red-orange patch over one eye (the spot), red-orange tongue.
//             The eyes are circles so they can follow the cursor. Same drawing as favicon.svg.
//   Wordmark  "DumpSpot" in Gloock.
//   Stamp     the herbarium seal: Spot inside a ring of type. Botanists stamp every pressed
//             specimen; architects stamp every drawing. Used only for big moments.
//   Tagline   "Field notes for the street you live on."
export const TAGLINE = "Field notes for the street you live on.";
export const DOG_CREDIT = "Dog drawing: OpenMoji (openmoji.org), CC BY-SA 4.0, recoloured.";

const L = `fill="none" stroke="#10231A" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"`;
// Spot's face in the 72-unit OpenMoji grid. Eyes sit at (27.9, 29.3) and (45.9, 29.3).
export const EYES = [
  [27.9, 29.3],
  [45.9, 29.3],
];
export const dog = (fur = "#FFFFFF") => `
  <g class="spot">
    <path fill="${fur}" d="m24.473,15.1583l-5.0799,1.9352-7.2963,7.901-4.1377,10.5005,1.291,5.3405c1.2554,3.7911,3.3357,6.4338,7.0626,9.2506l2.6874-2.5839s3.8218,7.7098,10.7384,8.9598c0,0,10.2616,1.936,15.5949-.8765,1.4899-.7857,2.5141-1.8291,3.2921-2.5939,2.0702-2.0351,3.033-3.5201,4.5413-5.2395h0s1.6701,1.8077,1.6701,1.8077l1.838-.0557,5.0169-7.2292,2.0032-5.0703-.0215-4.255-2.1735-5.6141-4.8333-7.4167s-2.6368-4.2558-8.1667-3.9167c0,0-6.5-4.8333-11.8333-4.0833s-3.6104-.6772-12.1937,3.2395Z"/>
    <path fill="#2448D8" d="m19.9509,28.3572c-2.3166,5.1597-.5084,13.0249.119,15.3759.122.4571.0755.9355-.1271,1.3631l-1.9874,4.1937c-.623,1.3146-2.3934,1.5533-3.331.4409-3.1921-3.7871-8.5584-11.3899-6.5486-16.686C11,27.5 14.6,22.4 19.8,19.4Z"/>
    <ellipse cx="46.6" cy="28.6" rx="5.4" ry="4.8" fill="#FF4A2E" opacity=".85"/>
    <path fill="#FF4A2E" d="m30.4364,50.0268s-.7187,8.7934,3.0072,9.9375c2.6459.8125,5.1497.5324,6.0625-.25.875-.75,2.6323-4.4741,1.8267-9.6875l-2.4-.3-2.9-2.6-3.1,2.4Z"/>
    <path fill="#10231A" d="m33.1089,37.006h6.1457c.4011,0,.7634.2397.9203.6089l1.1579,2.7245-2.1792,1.1456c-.6156.3236-1.3654-.0645-1.4567-.754l-2.9,0c-.1132.6268-.7757.9895-1.3647.7471l-2.3132-.952,1.0899-2.9035c.1465-.3901.5195-.6486.9362-.6486Z"/>
    <path ${L} d="m30.4364,50.0268s-.7187,8.7934,3.0072,9.9375c2.6459.8125,5.1497.5324,6.0625-.25.875-.75,2.6323-4.4741,1.8267-9.6875"/>
    <path ${L} d="m25.6245,42.8393c-.475,3.6024,2.2343,5.7505,4.2847,6.8414,1.1968.6367,2.6508.5182,3.7176-.3181l2.581-2.0233,2.581,2.0233c1.0669.8363,2.5209.9548,3.7176.3181,2.0504-1.0909,4.7597-3.239,4.2847-6.8414"/>
    <path ${L} d="m19.9509,28.3572c-2.3166,5.1597-.5084,13.0249.119,15.3759.122.4571.0755.9355-.1271,1.3631l-1.9874,4.1937c-.623,1.3146-2.3934,1.5533-3.331.4409-3.1921-3.7871-8.5584-11.3899-6.5486-16.686,7.0625-18.6104,15.8677-18.1429,15.8677-18.1429,2.8453-1.9336,13.1042-6.9375,24.8125.875,0,0,8.6323-1.7175,14.9375,16.9375,1.8036,5.3362-3.4297,12.8668-6.5506,16.6442-.9312,1.127-2.7162.8939-3.3423-.4272l-1.9741-4.1656c-.2026-.4275-.2491-.906-.1271-1.3631.6275-2.3509,2.4356-10.2161.119-15.3759"/>
    <path ${L} d="m52.6309,46.4628s-3.0781,6.7216-7.8049,8.2712"/>
    <path ${L} d="m19.437,46.969s3.0781,6.0823,7.8049,7.632"/>
    <path ${L} d="M36.2078 47.3393V44.3093"/>
    <circle class="spot-eye" cx="${EYES[0][0]}" cy="${EYES[0][1]}" r="2" fill="#10231A"/>
    <circle class="spot-eye" cx="${EYES[1][0]}" cy="${EYES[1][1]}" r="2" fill="#10231A"/>
  </g>`;

export const BRAND = `<svg class="spot-mark" viewBox="6 5 60 60" aria-hidden="true">${dog()}</svg>`;

// The stamp. `line` replaces the ring text for special uses (for example a report number).
let uid = 0;
export function stamp({ line = "DUMPSPOT · SPOT FINDS THE SPOT · EVERY REPORT EARNS A TREE ·", ink = "#10231A", paper = "#FFFFFF", spin = false } = {}) {
  const id = "ring" + ++uid;
  return `<svg class="stamp ${spin ? "stamp-spin" : ""}" viewBox="0 0 200 200" role="img" aria-label="DumpSpot. ${line.replace(/·/g, ",")}">
    <circle cx="100" cy="100" r="97" fill="${paper}" stroke="${ink}" stroke-width="2"/>
    <circle cx="100" cy="100" r="70" fill="none" stroke="${ink}" stroke-width="1"/>
    <circle cx="100" cy="100" r="66" fill="none" stroke="${ink}" stroke-width=".5" stroke-dasharray="1.5 3"/>
    <defs><path id="${id}" d="M100 100 m-82 0 a82 82 0 1 1 164 0 a82 82 0 1 1 -164 0"/></defs>
    <g class="stamp-ring"><text font-family="B612 Mono, monospace" font-size="12.6" letter-spacing="2.2" fill="${ink}"><textPath href="#${id}" textLength="510">${line}</textPath></text></g>
    <g transform="translate(37 36) scale(1.75)">${dog()}</g>
  </svg>`;
}

// Spot watches you: every visible Spot turns its eyes toward the cursor. Cheap: one rAF per move.
export function watchCursor() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let raf = 0, mx = 0, my = 0;
  addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!raf) raf = requestAnimationFrame(look);
  }, { passive: true });
  function look() {
    raf = 0;
    document.querySelectorAll(".spot").forEach((g) => {
      const svg = g.ownerSVGElement, m = g.getScreenCTM();
      if (!svg || !m || !svg.getClientRects().length) return;
      const p = new DOMPoint(mx, my).matrixTransform(m.inverse());
      g.querySelectorAll(".spot-eye").forEach((eye, i) => {
        const [cx, cy] = EYES[i];
        const a = Math.atan2(p.y - cy, p.x - cx), d = Math.min(1.3, Math.hypot(p.x - cx, p.y - cy) / 10);
        eye.setAttribute("cx", (cx + Math.cos(a) * d).toFixed(2));
        eye.setAttribute("cy", (cy + Math.sin(a) * d).toFixed(2));
      });
    });
  }
}

// Spot, standing and sniffing: OpenMoji "dog" (U+1F415), CC BY-SA 4.0, recoloured, with a clay
// spot on the flank, a moss collar and a pollen tag. Used for loading, empty and offline states.
// The dotted scent trail ahead of the nose pulses while Spot is "looking".
const WALK = `<path fill="#FFFFFF" d="m16.6968,14.0972l-.3388,2.1087c-.1129.519-1.3616,1.17-1.8773,1.2968l-1.0377.2552c-.2654.0653-.5057.2073-.6909.4083l-1.2013,1.304c-.226.2454-.5327.4013-.8642.4394l-3.8056.6337c-.5827.067-.07,2.426-.07,2.426.1884.3154,1.0266,1.132,1.3825,1.223l5.9453,1.2477c.568.1452.5905,1.7856.6467,2.3692l.3615,8.8989.0049.0482.5446,3.3609c.0575.355.2503.6739.5379.8899l4.1402,3.1091c.2294.1722.3999.4112.4882.684l1.1271,1.7672c.5596,1.729.629,4.8986.4371,6.7057l-.5456,5.3247c.0126.7144.3283,1.4191.9246,1.8127.089.0587.2182.0949.3712.1138,1.049.1294,2.039-.5321,2.4599-1.5016l1.5064-3.4707.0488-.1499,1.7796-7.9523c.1718-.7678.9457-1.2404,1.7072-1.0427h0c1.3066.3393,2.6647.4336,4.0057.2782l5.4182-.6279c.0687-.008.1367-.021.2034-.0391l7.0737-1.9151c.5475-.1482,1.1302.0508,1.4726.503l2.3735,3.1343,2.4204,3.2949c.3358.4571.5318,1.0018.5643,1.5681l.7963,5.3375c.1135,2.1878,1.7651,2.7989,2.6182,2.7237,0,0,1.586.0208,1.7338-2.2336l-.199-5.976c.0253-.7837-.0836-1.566-.3221-2.313l-.9911-3.1042c-.3926-1.2297-.471-2.5381-.228-3.8058l.6081-3.1732c.2066-1.078.1631-2.189-.1272-3.2476l-.1755-.6399c-.2252-.8212-.2013-1.6901.0655-2.4987.1958-.5933.432-1.1964.6084-1.3697.4775-.4693,4.8031-3.5057,5.4477-9.2232,1.347-11.9478-16.1699-13.7803-12.8901-11.0799l1.3145.3213c5.5799,2.1882,6.4456,4.6306,6.4456,4.6306,1.9087,3.6063-.3339,8.1105-1.5201,9.357l-.2282.2398c-.5055.5312-1.1213.9417-1.8066,1.2028-1.0223.3895-2.4457.9255-2.5666.9366-.1902.0176-3.3571-.3725-3.7821-.437s-7.6642-.2238-7.9142-.2257c-.2091-.0015-9.803-.074-12.9275-.0976-.5862-.0044-1.1021-.3758-1.297-.9287l-1.3691-3.885c-.046-.1305-.1112-.2534-.1934-.3646l-1.5687-2.522c-.0886-.1198-.1646-.2266-.2864-.3124l-.9112-.7811c-.2277-.1604-1.5735-.811-1.6719-1.0715l-.9346-2.4751c-.0177-.0469-.0379-.0927-.0605-.1374l-.7374-1.4553c-.2287-.4514-.6102-.8069-1.0766-1.0033l-.1094-.0461c-.8023-.3378-1.0724.3014-1.2575,1.1519Z"/><path fill="#E3E7DF" d="m44.3352,44.7665l.6057,1.8015c.2035.6052.5969,1.1284,1.1218,1.4919l2.1116,1.4622c.8325.5765,2.2047.9771,2.1658,1.989l-.5947,4.0453c-.1166.7931-.1811,1.5944-.1933,2.3959-.0049.3239-.0086.5836-.0086.5836.2004,1.2644,1.19,2.2572,2.4538,2.4615h0c.8904.144,1.8178-.1032,2.4655-.731.4927-.4776.9911-1.1855,1.2687-2.2145.0826-.306.0911-.6273.061-.9429-.1183-1.2421-.4393-4.6127-.6042-6.3436-.0653-.6858-.3671-1.3233-.8542-1.8104l-2.4824-2.4824c-.1753-.1753-.328-.372-.4543-.5853l-1.0603-1.7904c-.7434-1.2552-2.2898-1.7827-3.6453-1.2433l-1.8026.7172c-.473.1882-.7163.7133-.554,1.1958Z"/><path fill="#E3E7DF" d="m16.4295,38.5436c-.4718.6551-2.211,3.0924-3.4622,4.8741-1.0004,1.4246-1.8701,4.1212-1.8701,5.1958,0,1.2543.0164,2.436.4017,3.1582.5304.9942,1.2131,2.1711,1.7278,2.6338.4632.4164.9544.6915,1.5514.8688.2555.0759.7977.11,1.2604.1253.5046.0167,1.0036-.0977,1.4529-.3279l.2949-.1511c.1437-.0736.3387-.2546.5341-.4623.6524-.6935.9729-1.6673.7642-2.5963-.132-.5876-.4508-1.1243-1.155-1.2116-1.8836-.2336-2.0546-1.2336-1.6604-2.4479h0c-.0091-.0473.0098-.0956.0485-.1243l2.8272-2.0894c1.5-1.1085,1.6967-3.2776.4206-4.6379h0c-.0215-.0229-.046-.0429-.0728-.0593l-1.1922-.7324c-.6724-.2183-1.6197-.7391-1.6516-1.944-.0031-.1169-.1513-.1666-.2196-.0717Z"/><ellipse cx="40" cy="36.5" rx="5" ry="3.6" fill="#FF4A2E" opacity=".85"/><path fill="none" stroke="#10231A" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m58.4167,34.6667c.6667,1.6979.8506,2.9638.5159,4.5011l-1.1322,5.2009,1.9496,6.1068s.1206,4.7698.0014,8.2786c-.0369,1.087-.9494,1.9752-2.0371,1.9751h-.3531c-1.3464,0-1.9256-1.3248-1.9256-2.6712l-.8522-8.3913s-7.4907-5.4667-6.4583-13.6042"/><path fill="none" stroke="#10231A" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m33.2655,45.25c3.8333-.2052,11.2345,0,14.9845-2.6875"/><path fill="none" stroke="#10231A" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m51.3753,12c5.7603,1.5458,8.0746,4.2902,8.6494,7.2047,1.0392,5.269-4.012,9.798-9.2239,8.5024-2.5257-.6278-4.6488-.4429-4.6488-.4429l-18.402-.1392c-1.6875-8.125-6.4473-9.565-6.4473-9.565-.726-4.6648-3.2625-5.4159-4.0605-5.5368-.1336-.0202-.2558.0704-.2751.2041l-.5352,3.7024c-.0784.5421-.4973.9719-1.0372,1.0641l-.59.1008c-.7639.1305-1.4727.4822-2.0386,1.0117l-.894.8364c-.3126.2925-.7119.4754-1.1376.5212l-3.4582.372c-.7613.0819-.9791,2.1238-.6832,2.8301l.6306.8521c.2896.6913.9063,1.1916,1.6425,1.3325l6.4671.7328s-1,13.1667,2.7292,15.1667c8.1309,4.3607,4.4071,16.5216,4.4071,16.5216-.8217,1.4362-.1868,3.4576,1.4679,3.4576h.0015c.7939,0,1.5235-.4367,1.8987-1.1364l2.0998-5.4678,1.3773-9.1448c.1081-.7178-.0364-1.4427-.3653-2.0898-.576-1.1333-1.2539-3.3607-.137-6.5258"/><path fill="none" stroke="#10231A" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15.9846,39.0505l-4.3515,6.655c-.3212.4697-.5044,1.03-.5192,1.6187-.044,1.7553-.2547,5.5414,2.9991,7.69.8545.5642,2.4644.6389,3.3141.1114.7175-.4455,1.3028-1.2911.7739-2.8914"/><line x1="20.284" x2="15.875" y1="44.1866" y2="47.2664" fill="none" stroke="#10231A" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path fill="none" stroke="#10231A" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m46.1667,47.2664c.4329,1.5669,3.0772,3.003,4.25,3.7336,0,0-.9357,5.3422-1.0698,7.1428-.0484.6505.1869,1.281.5906,1.7322,1.0625,1.1875,2.4301.6653,2.4301.6653"/><circle cx="14.6" cy="18.6" r="1.2" fill="#10231A"/><path d="M20.6 22.8l1.6 4.6" stroke="#2448D8" stroke-width="2.4" stroke-linecap="round"/><circle cx="21.8" cy="28.4" r="1.3" fill="#FFD23F" stroke="#10231A" stroke-width=".6"/>`;
export const spotWalk = ({ sniff = true } = {}) =>
  `<svg class="spot-walk ${sniff ? "sniffing" : ""}" viewBox="-6 6 78 60" aria-hidden="true">
    ${sniff ? '<g class="scent"><circle cx="2" cy="24" r="1"/><circle cx="-1.5" cy="27.5" r="1"/><circle cx="1" cy="31" r="1"/></g>' : ""}
    <g class="spot-body">${WALK}</g>
  </svg>`;

// The title block: the strip at the foot of every page, set like the title block on an
// architectural drawing. Sheet name, city, the record, and who drew it.
export function titleBlock({ sheet = "", city = "", reports = 0, offline = false } = {}) {
  const d = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  return `<div class="tb-id"><span class="tb-mark">${BRAND}</span><span><b class="brand-word">DumpSpot</b><small>${TAGLINE}</small></span></div>
    <dl class="tb-cells">
      <div><dt>Sheet</dt><dd>${sheet}</dd></div>
      <div><dt>City</dt><dd>${city || "Not chosen"}</dd></div>
      <div><dt>On record</dt><dd>${offline ? "Database offline" : reports + " reports · " + reports + " trees"}</dd></div>
      <div><dt>Drawn with</dt><dd><a href="#/credits">Open source</a></dd></div>
      <div><dt>Date</dt><dd>${d}</dd></div>
    </dl>`;
}
