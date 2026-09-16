# Halieus Game Room 3.5.22

## Mega Board live viewport repair

- Removed the erroneous full-page `height: 100%` from the desktop live play-grid item.
- The active page remains a two-row composition: metadata header + true remaining play area.
- Mega Board is now top-anchored immediately below the header instead of being vertically centred inside an oversized hidden area.
- The board fills the available row height while remaining square and respecting the centre-column width.
- Left and right player rails stretch with the play area and scroll internally when their cards exceed the viewport.
- No Oracle deployment/updater behaviour was changed in this release beyond the normal release version stamp.
