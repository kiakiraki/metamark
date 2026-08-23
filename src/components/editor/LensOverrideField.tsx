import { OverrideField } from './OverrideField';

export function LensOverrideField() {
  return (
    <OverrideField
      fieldKey="lens"
      label="Lens Override"
      labelId="lens-override-label"
      emptyPlaceholder="No lens info in EXIF"
      description="Override the lens name displayed on the overlay. Useful for old/manual lenses without EXIF lens info."
    />
  );
}
