# HGR Branding References — Source of Truth

This folder contains **approved visual source material**. Reference images are not mood boards to reinterpret.

## Authority rule

Every approved PNG stored directly in:

```text
assets/branding/references/
```

is part of the visual source of truth.

Do **not** assume a fixed number of reference PNGs. If another approved PNG is added to this folder, it joins the reference set automatically and must be reviewed before changing production artwork.

The extensionless `web mock up` file is a website/layout reference and must not be treated as launcher-art authority unless explicitly documented for that purpose.

## Approved launcher outputs

Approved Windows launcher ICOs live under:

```text
assets/branding/launchers/matte/
```

Those files are protected production assets. Existing accepted ICOs from the reference-led launcher work must not be redrawn, recoloured, deleted or replaced by a generator.

## Non-negotiable rule

**Reference artwork beats generated interpretation.**

Do not:

- redraw the launcher family from a textual description;
- invent a new H silhouette;
- recolour approved launcher artwork because a palette sounds reasonable;
- replace approved ICOs with SVG/PNG exports from a generator;
- treat a generated mockup as approved merely because it resembles the references;
- let shortcut/update/start/restart scripts modify approved artwork.

If an approved asset needs changing:

1. inspect the complete current PNG reference set in this folder;
2. start from the applicable approved reference;
3. make only the requested targeted visual change;
4. obtain human visual approval;
5. replace the relevant production asset deliberately;
6. update documentation/regression protection.

## Experimental output

Generated or experimental launcher previews may only live under:

```text
assets/branding/launchers/generated-preview/
```

They are never production replacements for the approved reference-based icons.
