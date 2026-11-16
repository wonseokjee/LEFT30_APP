# Calico Cat Regeneration Guide

`calico_cat_tail_up.png` is the final visual master for this set (the approved
v7 artwork, promoted to its standard filename). For all
future assets, change only the pose line. Regenerate as a new file first; do
not overwrite an approved asset until the replacement has been reviewed.

Later `tail_up` contour experiments are rejected and must not be used as image
or prompt references.

## Locked generation rule

- Reference `calico_cat_tail_up.png` for every generation.
- Change only the requested pose, including paw placement, body gesture, head
  direction, and tail gesture when required by that pose.
- Keep all other visual decisions fixed to v7: face proportions, body proportions,
  expression, line color and softness, watercolor texture, illustration scale,
  framing, and transparent background.
- For a different cat variety, change only coat colors and coat-patch pattern.
  Keep the same v7 face, body, watercolor treatment, and outline treatment.

## Style lock

- Cute calico kitten with a light, moderately slim silhouette in a lively
  three-quarter side view, facing right; use slightly longer graceful legs.
- A gently rounded, proportionate head, warm brown eyes with small white highlights, pink triangle
  nose, tiny W-shaped smile, and long fine white whiskers.
- Lock the face at the exact midpoint between `tail_up_v5` and `tail_up_v6`:
  retain v5’s width/height proportion halfway toward v6’s narrower oval. Do
  not change any other feature from the v6 style lock.
- Cream-white muzzle, chest, belly, and legs. Deep chocolate brown covers the
  left side of the face and ear; warm orange covers the right forehead and ear;
  a clean white blaze runs between the eyes to the muzzle.
- Irregular orange and chocolate patches flow across the back and raised,
  left-curving tail. Use very soft, intermittent watercolor-edge contours, not
  a continuous drawn outline.
- When a contour is visible, its pigment must be the same muted warm medium
  chocolate brown as `calico_cat_tail_up.png`, never pale beige, gray, or cool taupe.
- Match `calico_cat_tail_up.png` specifically: a slightly dark, warm reddish-brown
edge pigment with varied watercolor opacity; do not darken, lighten, or change
the thickness of the v7 outline.
- Children’s-book watercolor: visible fine paper grain, layered translucent
  pigment, subtly uneven edges, warm beige shadowing. Never use flat vector
  fills, thick outlines, realistic fur, a ground plane, text, or accessories.
- Output must be a full-body, isolated PNG with a truly transparent background.

## Shared prompt

Use this after the pose line for every asset:

```text
Use case: illustration-story
Asset type: transparent game character asset
Subject: a single cute calico kitten with a light, moderately slim silhouette,
full body, facing right in a lively three-quarter side view. Slightly longer
graceful legs and a gently rounded, proportionate head; large warm brown eyes with small
white highlights; pink triangular nose; tiny friendly W-shaped mouth; long fine
white whiskers. Lock the face at the exact midpoint between tail_up_v5 and
tail_up_v6: retain v5’s width/height proportion halfway toward v6’s narrower
oval. Do not change any other feature from the v6 style lock.
Cream-white muzzle, chest, belly and legs. Deep chocolate brown
covers the kitten’s left facial side and ear; warm orange covers its right
forehead and ear; a clean white blaze runs between the eyes to the muzzle.
Irregular warm-orange and deep-chocolate patches flow naturally across the back
and tail.
Style/medium: hand-painted children’s-book watercolor, fine visible paper grain,
layered soft pigment, slightly uneven painted edges, gentle warm beige shadows,
extremely soft, broken watercolor-edge contours rather than a continuous ink
outline. The visible contour pigment is muted warm medium chocolate brown,
matching calico_cat_tail_up.png; never gray, beige, or taupe. Use its slightly
dark warm reddish-brown edge pigment with varied watercolor opacity. Do not
darken, lighten, or alter the thickness of the v7 outline. The brown edge fades
into paper texture in places. Let pigment
boundaries between orange, brown, and cream subtly bleed together.
Scene/backdrop: no scene, genuinely transparent background.
Constraints: preserve the same character design, face/body proportions, outline
color, watercolor treatment, and framing as calico_cat_tail_up; change only
the pose line. For another variety, change only coat colors and coat-patch
pattern. Full body in frame; no crop; no text; no props; no ground shadow.
Avoid: vector art, flat digital fill, thick sharp outlines, continuous dark
contours, crisp sticker-like edges, a wide barrel-shaped body, oversized cheeks,
an oversized face or muzzle, pale gray/beige/taupe outlines, realistic fur, stiff
pose, background, watermark.
```

## Pose lines and output names

| Output file | Pose line to prepend to the shared prompt |
| --- | --- |
| `calico_cat_tail_up_v2.png` | The tail rises from the back and curves gently left with a rounded tip; use a relaxed walking stance, not a rigid vertical-tail pose. |
| `calico_cat_tail_up_v3.png` | The tail rises from the back and curves gently left with a rounded tip; use a relaxed walking stance, a light slim torso, and soft broken watercolor contours rather than a rigid vertical-tail pose. |
| `calico_cat_yawn_v2.png` | Sitting comfortably, head tilted slightly up, eyes squeezed shut, mouth open in a wide cute yawn; raised tail softly curved left. |
| `calico_cat_stretch_v2.png` | Front paws reach far forward and low, chest close to the floor, hips and curved tail lifted high in a long relaxed stretch. |
| `calico_cat_sleep_v2.png` | Curled into a compact sleeping crescent, eyes closed peacefully, tail wrapped around the body, all four paws tucked in. |
| `calico_cat_sit_watch_v2.png` | Sitting alertly with front paws together and tail curved beside the body, looking upward with curious wide eyes. |
| `calico_cat_peek_v2.png` | Peeking around an implied vertical edge from the right, only the face, one shoulder, front paws, and curled tail visibly entering frame; no actual object or background. |
| `calico_cat_loaf_v2.png` | Resting in a compact cat-loaf pose, paws completely tucked beneath the rounded body, tail hidden, calm half-open eyes. |
| `calico_cat_knead_v2.png` | Crouched contentedly while kneading, one front paw presses forward as the other lifts, soft happy eyes, tail loosely curved upward. |
| `calico_cat_jump_up_v2.png` | Mid-air leap upward toward the right, front paws extended high, rear paws trailing, tail forming a graceful leftward curve, delighted expression. |
| `calico_cat_groom_v2.png` | Sitting with one hind leg lifted, bending to lick a front paw in a grooming pose; relaxed closed eyes and a curled tail. |
| `calico_cat_eat_v2.png` | Crouched low with the head lowered to eat from a small plain bowl, forepaws beside it, tail curved behind; no food details outside the bowl. |
| `calico_cat_climb_down_v2.png` | Carefully climbing downward toward the right, front paws reaching lower, hind legs higher, body diagonally descending, tail lifted for balance; no ladder or background. |

## Review checklist

1. Compare facial mask, eye size, body roundness, patch colors, outline weight,
   and watercolor grain against `calico_cat_walk.png`.
2. Confirm a transparent background and no clipped ears, paws, whiskers, or tail.
3. Keep approved files untouched; promote a `_v2` image only after visual review.
