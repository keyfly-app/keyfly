# Campaign photography

AI-generated lifestyle images for ads (PPC, social) and the website. No text or logos on the images –
headlines are added per placement. Every image leaves calm negative space for copy (side noted below).

Source: OpenArt, model GPT Image 2.5 Sunburst, high quality, generated 2026-10-31
(OpenArt project `pPRghpaCm09jiH5aNYCw`). Stored as JPEG (q86); originals stay in OpenArt.

Shared look: classic Budapest apartments (herringbone parquet, tall white windows, stucco), warm natural light,
light film grain, candid moments; wardrobe in brand deep green with a small lime accent.

| File | Ratio · size | Audience | Scene | Copy space |
|---|---|---|---|---|
| `tenant-move-in-couple-3x2-{a,b}.jpg` | 3:2 · 2016×1344 | tenant | Couple among moving boxes, she holds up the key | left |
| `both-key-handover-3x2-{a,b}.jpg` | 3:2 · 2016×1344 | tenant + landlord | Landlady hands the key over in a courtyard-balcony doorway | left |
| `tenant-first-evening-4x5-{a,b}.jpg` | 4:5 · 1344×1680 | tenant | Young man eats takeaway on the floor, first evening | top |
| `tenant-family-arrival-1x1-{a,b}.jpg` | 1:1 · 1360×1360 | tenant (family) | Family arrives, daughter runs into the empty room | top-left |
| `tenant-morning-window-9x16-{a,b}.jpg` | 9:16 · 1296×2304 | tenant | Woman with coffee at the window, Danube view | top + bottom (stories) |
| `landlord-doorway-16x9-{a,b}.jpg` | 16:9 · 2304×1296 | landlord | Landlord in the doorway of his renovated flat | left |
| `tenant-meter-reading-3x2-{a,b}.jpg` | 3:2 · 2016×1344 | tenant (Pro) | Tenant photographs the water meter with her phone | left |
| `landlord-kitchen-laptop-3x2-{a,b}.jpg` | 3:2 · 2016×1344 | landlord (Pro) | Landlady at the kitchen table with laptop, folder and keys | left |
| `manager-office-3x2-{a,b}.jpg` | 3:2 · 2016×1344 | property manager | Property manager with a tablet in front of a key cabinet | left |

In use (registry: `src/content/photos.ts`, every placement labelled "AI-generált kép" / "AI-generated image"):
home photo band, waitlist email (`public/email/move-in.jpg`) and share images (`public/og/`) – move-in couple a;
audience cards – first evening b, landlord a; trust section – key handover a.

Ad formats: crop 3:2 / 16:9 to 1.91:1 (1200×628) for Google Display and Meta link ads; 1:1 and 4:5 for feeds;
9:16 for stories and reels.

## Prompts (for consistent follow-ups)

All prompts start with "Authentic editorial lifestyle photograph for a fintech rental brand campaign." and end with
the composition note and "No text, no logos, no watermarks."

- **Move-in couple** – late-twenties couple just inside a classic Budapest apartment among boxes and a rolled rug;
  she laughs and holds up a brass key, he hugs her; she wears a deep forest-green knit sweater, he an oatmeal
  shirt; small lime-green plant on a box; late-afternoon light; 35mm f/2; subjects right third.
- **Key handover** – landlady in her fifties (camel cardigan) places a brass key into the palm of a late-twenties
  tenant (forest-green jacket, backpack, box at her feet) in a doorway onto a sunlit courtyard balcony (gangos ház);
  morning light; 50mm f/2; people right half.
- **First evening** – man around 25 (forest-green hoodie) sits cross-legged on the parquet against boxes eating
  takeaway noodles, key on the box; golden hour over Budapest rooftops; 35mm f/2; subject lower half.
- **Family arrival** – parents in their early thirties carry a box and a plant through double doors, five-year-old
  daughter (lime-green cardigan) runs ahead; father in forest-green sweater; late-morning light; 35mm f/2.8.
- **Morning window** – late-twenties woman (forest-green cardigan) with a coffee mug at an open window over the
  Danube; boxes and a lime-green plant; early golden light; 50mm f/2; space top and bottom.
- **Meter reading** – late-twenties tenant (forest-green sweater) crouches in a Budapest hallway photographing the
  wall water meter with her phone; meter and screen out of focus; 35mm f/2; subject right half.
- **Landlord at home** – early-fifties landlady (forest-green cardigan) at a kitchen table with laptop (screen away),
  coffee, document folder, keys, lime-green plant; morning light; 50mm f/2.
- **Property manager** – mid-thirties manager (navy blazer) with a tablet in a small office, key cabinet with blank
  tags behind, forest-green armchair; 50mm f/2.2; subject right third.
- **Landlord** – late-forties landlord (navy knit polo, chinos), arms loosely crossed, key ring in hand, in the
  doorway of a bright renovated living room with a forest-green sofa; clean daylight; 50mm f/2.2; subject right third.
